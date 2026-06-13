import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const mapMarkers = await getPayloadSDK(fetch, request).find({
		collection: 'map-markers',
		depth: 2
	});

	return {
		mapMarkers: mapMarkers.docs
	};
};
