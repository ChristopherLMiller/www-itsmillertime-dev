import { getPayloadSDK } from '$lib/payload';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Single gallery-image row from Payload.
 * Default: thumbnail-shaped media (galleries landing), same shape as album hover preview.
 * `?full=1`: full gallery-image document at depth 1 (nested `image` media for lightbox / grid).
 */
export const GET: RequestHandler = async ({ params, url, fetch, request }) => {
	const galleryImageId = Number(params.id);
	if (!Number.isFinite(galleryImageId)) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	const full = url.searchParams.get('full') === '1';

	const sdk = getPayloadSDK(fetch, request);

	const result = await sdk.find({
		collection: 'gallery-images',
		where: { id: { equals: galleryImageId } },
		limit: 1,
		page: 1,
		depth: full ? 1 : 0
	});

	const doc = result.docs?.[0];
	if (!doc) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (full) {
		return json(doc);
	}

	const payload = {
		thumbnailURL: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
		id: doc.id,
		blurhash: doc.blurhash ?? null,
		width: doc.sizes?.thumbnail?.width ?? doc.width ?? null,
		height: doc.sizes?.thumbnail?.height ?? doc.height ?? null,
		url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? doc.url ?? '',
		sizes: {
			thumbnail: {
				url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
				width: doc.sizes?.thumbnail?.width ?? null,
				height: doc.sizes?.thumbnail?.height ?? null
			}
		}
	};

	return json(payload);
};
