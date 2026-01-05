import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Fetch one featured model
	const modelsData = await getPayloadSDK(fetch).find({
		collection: 'models',
		sort: '-model_meta.completionDate',
		limit: 1,
		where: {
			'model_meta.status': {
				equals: 'completed'
			}
		},
		select: {
			id: true,
			model_meta: true
		}
	});

	// Fetch one featured article
	const articlesData = await getPayloadSDK(fetch).find({
		collection: 'posts',
		limit: 1,
		sort: '-publishedAt',
		select: {
			featuredImage: true
		},
		where: {
			_status: {
				equals: undefined
			}
		}
	});

	return {
		featuredModelImage: modelsData.docs[0]?.model_meta?.featuredImage || null,
		featuredArticleImage: articlesData.docs[0]?.featuredImage || null
	};
};
