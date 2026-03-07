import { getPayloadSDK } from '$lib/payload';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Fetches all images for a gallery album.
 * First does a count query, then fetches that many images.
 * Used when hovering an album on the galleries landing page to load the full stack.
 */
export const GET: RequestHandler = async ({ params, fetch, request }) => {
	const albumId = Number(params.albumId);
	if (!Number.isFinite(albumId)) {
		return json({ error: 'Invalid album ID' }, { status: 400 });
	}

	const sdk = getPayloadSDK(fetch, request);

	// First fetch with limit 1 to get totalDocs (count)
	const countResult = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: albumId
			}
		},
		limit: 1,
		page: 1,
		depth: 1
	});

	const totalDocs = countResult.totalDocs ?? 0;

	if (totalDocs === 0) {
		return json({ docs: [], totalDocs: 0 });
	}

	// Fetch all images with the count as limit
	const imagesResult = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: albumId
			}
		},
		limit: totalDocs,
		page: 1,
		depth: 1
	});

	return json({
		docs: imagesResult.docs,
		totalDocs: imagesResult.totalDocs
	});
};
