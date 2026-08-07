import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const mapMarkers = await getPayloadSDK(fetch, request).find({
		collection: 'map-markers',
		depth: 1,
		select: {
			title: true,
			location: true,
			visits: true,
			rating: true,
			links: true,
			createdAt: true,
			updatedAt: true
		}
	});

	return {
		mapMarkers: mapMarkers.docs
	};
};
