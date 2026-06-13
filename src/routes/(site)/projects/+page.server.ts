import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const sdk = getPayloadSDK(fetch, request);

	const limit = Number(url.searchParams.get('limit')) || 50;
	const page = Number(url.searchParams.get('page')) || 1;

	const { docs: projects, ...meta } = await sdk.find({
		collection: 'projects',
		limit,
		page,
		sort: '-createdAt',
		depth: 2,
		where: {
			_status: { not_equals: 'draft' }
		}
	});

	return { projects, meta };
};
