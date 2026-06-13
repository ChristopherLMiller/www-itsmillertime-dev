import { getPayloadSDK } from '$lib/payload/sdk.server';
import { canAccessGallerySettings } from '$lib/utils/gallery-access';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const IMAGE_BATCH_SIZE = 30;
const GALLERY_LANDING = '/galleries';

const albumSettingsSelect = {
	isNsfw: true,
	visibility: true,
	permittedRoles: true,
	allowedUsers: true
} as const;

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

export const load: PageServerLoad = async ({ params, fetch, request, url, parent }) => {
	const { slug } = params;
	const { session } = await parent();
	const user = session?.user ?? null;
	const sdk = getPayloadSDK(fetch, request);

	const galleriesData = await sdk.find({
		collection: 'gallery-albums',
		where: {
			slug: {
				equals: slug
			}
		},
		limit: 1,
		depth: 2,
		select: {
			id: true,
			slug: true,
			title: true,
			settings: {
				...albumSettingsSelect,
				category: { title: true },
				tags: { title: true }
			},
			content: true,
			meta: {
				description: true,
				title: true,
				image: {
					id: true,
					url: true,
					alt: true,
					width: true,
					height: true,
					sizes: {
						og: { url: true, width: true, height: true }
					}
				}
			},
			createdAt: true,
			updatedAt: true
		}
	});

	const gallery = galleriesData.docs[0];

	if (!gallery || !canAccessGallerySettings(gallery.settings, user)) {
		redirectToGalleryLanding();
	}

	const selectedRaw = url.searchParams.get('selected');
	let selectedGalleryImageId: number | null = null;

	if (selectedRaw) {
		const selectedId = Number(selectedRaw);
		if (!Number.isFinite(selectedId) || selectedId <= 0) {
			redirectToGalleryLanding();
		}

		const selectedImage = await sdk.findByID({
			collection: 'gallery-images',
			id: selectedId,
			depth: 0,
			select: {
				id: true,
				albums: true,
				settings: albumSettingsSelect
			},
			disableErrors: true
		});

		if (!selectedImage || !canAccessGallerySettings(selectedImage.settings, user)) {
			redirectToGalleryLanding();
		}

		const albumIds = albumIdsFromRelation(selectedImage.albums);
		if (!albumIds.includes(gallery.id)) {
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
	}

	// First page: ids (+ per-image NSFW for client filtering); each grid cell fetches full row via API.
	const imagesData = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: gallery.id
			}
		},
		limit: IMAGE_BATCH_SIZE,
		page: 1,
		depth: 0,
		select: {
			id: true,
			width: true,
			height: true,
			blurhash: true,
			settings: { isNsfw: true }
		}
	});

	const galleryWithPagedImages = {
		...gallery,
		meta: gallery.meta,
		images: {
			docs: imagesData.docs,
			totalDocs: imagesData.totalDocs,
			hasNextPage: imagesData.hasNextPage,
			nextPage: imagesData.nextPage,
			page: imagesData.page,
			totalPages: imagesData.totalPages
		}
	};

	// Meta for the Meta component (svelte:head) - must be in page.data for SSR
	const metaImage = typeof gallery.meta?.image === 'object' ? gallery.meta.image : null;

	return {
		gallery: galleryWithPagedImages,
		selectedGalleryImageId,
		meta: {
			title: gallery.title,
			metaTitle: gallery.meta?.title ?? gallery.title,
			description: gallery.meta?.description ?? undefined,
			metaDescription: gallery.meta?.description ?? undefined,
			image: metaImage,
			metaImage,
			canonicalURL: `${url.origin}/galleries/${slug}`
		}
	};
};
