import { getPayloadSDK } from '$lib/payload.server';
import { payloadSwrInit } from '$lib/payloadSwr';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Single gallery-image row from Payload.
 * `?data=basic` (default): thumbnail-shaped media, same shape as album hover preview.
 * `?data=full`: full gallery-image document at depth 1 (nested `image` media for lightbox / grid).
 */
export const GET: RequestHandler = async ({ params, url, fetch, request }) => {
	const galleryImageId = Number(params.id);
	if (!Number.isFinite(galleryImageId)) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	const raw = url.searchParams.get('data')?.toLowerCase() ?? 'basic';
	if (raw !== 'basic' && raw !== 'full') {
		return json({ error: 'Invalid data parameter; use basic or full' }, { status: 400 });
	}
	const wantFull = raw === 'full';

	const sdk = getPayloadSDK(fetch, request);

	const result = await sdk.find(
		{
			collection: 'gallery-images',
			where: { id: { equals: galleryImageId } },
			limit: 1,
			page: 1,
			depth: wantFull ? 1 : 0
		},
		payloadSwrInit()
	);

	const doc = result.docs?.[0];
	if (!doc) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (wantFull) {
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
