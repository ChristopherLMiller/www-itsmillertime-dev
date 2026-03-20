import { getPayloadSDK } from '$lib/payload';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const sdk = getPayloadSDK(fetch, request);
	const result = await sdk.find({
		collection: 'gardens',
		limit: 100,
		sort: '-updatedAt',
		depth: 2
	});

	return { gardens: result.docs };
};
