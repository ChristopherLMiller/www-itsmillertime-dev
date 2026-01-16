import { getPayloadSDK } from '$lib/payload';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const mapMarkers = await getPayloadSDK(fetch).find({
		collection: 'map-markers',
		depth: 2
	});

	return {
		mapMarkers: mapMarkers.docs
	};
};
