import { getPayloadSDK } from '$lib/payload';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Lightweight preview images for a gallery album (polaroid stack hover).
 */
export const GET: RequestHandler = async ({ params, fetch, request }) => {
	const albumId = Number(params.albumId);
	if (!Number.isFinite(albumId)) {
		return json({ error: 'Invalid album ID' }, { status: 400 });
	}

	const sdk = getPayloadSDK(fetch, request, { cacheGallerySwr: { enabled: true } });

	const imagesResult = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: albumId
			}
		},
		sort: '-createdAt',
		limit: 10,
		page: 1,
		depth: 0
	});

	const docs = (imagesResult.docs ?? []).map((doc) => ({
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
	}));

	return json({
		docs,
		totalDocs: imagesResult.totalDocs
	});
};
