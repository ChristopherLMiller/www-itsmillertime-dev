import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const modelsData = await getPayloadSDK(fetch).find({
		collection: 'models',
		sort: '-model_meta.completionDate',
		limit: Number(url.searchParams.get('limit')) || 15,
		page: Number(url.searchParams.get('page')) || 1,
		select: {
			id: true,
			title: true,
			createdAt: true,
			updatedAt: true,
			slug: true,
			model_meta: true,
			clockify_project: true
		}
	});

	const { docs: models, ...meta } = modelsData;
	return {
		models,
		meta
	};
};
