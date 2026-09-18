import { getParentSession } from '$lib/auth/parentSession';
import { albumSettingsSelect, loadGalleryAlbumPageData } from '$lib/cache/galleryCache.server';
import type { GalleryAlbumPageMeta } from '$lib/cache/galleryCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { canAccessGallerySettings } from '$lib/utils/gallery-access';
import { buildGalleryImagePageMeta } from '$lib/utils/gallery-image-seo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const GALLERY_LANDING = '/galleries';

function redirectToGalleryLanding(): never {
	throw redirect(303, GALLERY_LANDING);
}

function albumIdsFromRelation(albums: unknown): number[] {
	if (!Array.isArray(albums)) return [];
	return albums
		.map((entry) => {
			if (typeof entry === 'number') return entry;
			if (typeof entry === 'object' && entry !== null && 'id' in entry) {
				const id = (entry as { id?: unknown }).id;
				return typeof id === 'number' ? id : null;
			}
			return null;
		})
		.filter((id): id is number => typeof id === 'number');
}

export const load: PageServerLoad = async ({ params, fetch, request, url, parent, depends }) => {
	depends('app:gallery-album');
	const { slug } = params;
	const session = await getParentSession(parent);
	const user = session?.user ?? null;

	const initialGallery = await loadGalleryAlbumPageData(slug, url.origin, {
		fetch,
		request,
		user
	});

	if (!initialGallery) {
		redirectToGalleryLanding();
	}

	const selectedRaw = url.searchParams.get('selected');
	let selectedGalleryImageId: number | null = null;
	let meta: GalleryAlbumPageMeta = initialGallery.meta;

	if (selectedRaw) {
		const selectedId = Number(selectedRaw);
		if (!Number.isFinite(selectedId) || selectedId <= 0) {
			redirectToGalleryLanding();
		}

		const sdk = getPayloadSDK(fetch, request);
		const selectedImage = await sdk.findByID({
			collection: 'gallery-images',
			id: selectedId,
			depth: 0,
			select: {
				id: true,
				albums: true,
				settings: albumSettingsSelect,
				alt: true,
				caption: true,
				filename: true,
				url: true,
				width: true,
				height: true,
				sizes: { og: true },
				meta: true
			},
			disableErrors: true
		});

		if (!selectedImage || !canAccessGallerySettings(selectedImage.settings, user)) {
			redirectToGalleryLanding();
		}

		const albumIds = albumIdsFromRelation(selectedImage.albums);
		if (!albumIds.includes(initialGallery.gallery.id)) {
			const redirectAlbumId = albumIds[0];
			if (redirectAlbumId != null) {
				const owningAlbum = await sdk.findByID({
					collection: 'gallery-albums',
					id: redirectAlbumId,
					depth: 0,
					select: {
						slug: true,
						settings: albumSettingsSelect
					},
					disableErrors: true
				});
				if (
					owningAlbum?.slug &&
					owningAlbum.slug !== slug &&
					canAccessGallerySettings(owningAlbum.settings, user)
				) {
					throw redirect(302, `/galleries/${owningAlbum.slug}?selected=${selectedId}`);
				}
			}
			redirectToGalleryLanding();
		}

		selectedGalleryImageId = selectedId;
		meta = buildGalleryImagePageMeta({
			image: selectedImage,
			albumMeta: initialGallery.meta,
			origin: url.origin,
			slug,
			selectedId
		});
	}

	return {
		slug,
		initialGallery,
		selectedGalleryImageId,
		meta
	};
};
