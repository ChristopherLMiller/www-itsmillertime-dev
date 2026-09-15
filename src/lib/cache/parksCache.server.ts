import type { ParksCacheData } from '$lib/cache/parksCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';

export type ParksLoadOptions = {
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

export async function loadParksPageData(options: ParksLoadOptions = {}): Promise<ParksCacheData> {
	const { fetch, request } = options;
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

	return { mapMarkers: mapMarkers.docs };
}
