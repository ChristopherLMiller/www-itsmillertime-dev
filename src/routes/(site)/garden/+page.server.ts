import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const sdk = getPayloadSDK(fetch, request);
	const result = await sdk.find({
		collection: 'gardens',
		limit: 100,
		sort: '-updatedAt',
		depth: 1,
		select: {
			name: true,
			slug: true,
			featuredImage: true,
			content: true
		}
	});

	return { gardens: result.docs };
};
