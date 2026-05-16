import { error, redirect } from '@sveltejs/kit';
import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload.server';
import { getMediaUrl } from '$lib/utils/media-url';
import type { GalleryImage, Media } from '$lib/types/payload-types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { url, fetch, request } = event;

	const mergedUser = await getMergedSessionUser(event);
	if (!mergedUser || !isAdminRole(mergedUser)) {
		throw redirect(303, '/share-target');
	}

	const kind = url.searchParams.get('kind');
	const id = Number.parseInt(url.searchParams.get('id') ?? '', 10);
	if (!Number.isFinite(id) || id <= 0) error(400, 'Invalid link');
	if (kind !== 'media' && kind !== 'gallery-image') error(400, 'Invalid link');

	const sdk = getPayloadSDK(fetch, request);
	const collection = kind === 'media' ? 'media' : 'gallery-images';
	const doc = (await sdk.findByID({
		collection,
		id,
		depth: kind === 'gallery-image' ? 1 : 0,
		disableErrors: true
	})) as (Media | GalleryImage) | null;

	if (!doc) error(404, 'Not found');

	const sizes = doc.sizes as Record<string, { url?: string | null }> | undefined;
	const path = sizes?.xlarge?.url ?? sizes?.large?.url ?? doc.url ?? sizes?.medium?.url ?? '';

	const previewUrl = path ? getMediaUrl(path, true) : '';
	const directFileUrl = path ? getMediaUrl(path, false) : '';

	let galleryPageUrl: string | null = null;
	if (kind === 'gallery-image' && 'albums' in doc && doc.albums?.[0]) {
		const al0 = doc.albums[0];
		if (typeof al0 === 'object' && al0 && 'slug' in al0 && typeof al0.slug === 'string') {
			galleryPageUrl = `${url.origin}/galleries/${al0.slug}`;
		}
	}

	return {
		kind: kind as 'media' | 'gallery-image',
		id,
		alt: doc.alt,
		previewUrl,
		directFileUrl,
		galleryPageUrl
	};
};
