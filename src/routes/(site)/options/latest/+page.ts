import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Fetch latest model
	const modelsData = await getPayloadSDK(fetch).find({
		collection: 'models',
		sort: '-updatedAt',
		limit: 1,
		select: {
			id: true,
			title: true,
			slug: true,
			updatedAt: true,
			model_meta: true
		}
	});

	// Fetch latest article
	const articlesData = await getPayloadSDK(fetch).find({
		collection: 'posts',
		limit: 1,
		sort: '-publishedAt',
		select: {
			publishedAt: true,
			slug: true,
			title: true,
			featuredImage: true,
			createdAt: true,
			category: true
		},
		where: {
			_status: {
				equals: undefined
			}
		}
	});

	return {
		latestModel: modelsData.docs[0] || null,
		latestArticle: articlesData.docs[0] || null
	};
};
