import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Fetch models
	const modelsData = await getPayloadSDK(fetch).find({
		collection: 'models',
		sort: '-updatedAt',
		limit: 12,
		select: {
			id: true,
			title: true,
			createdAt: true,
			updatedAt: true,
			slug: true,
			model_meta: true
		}
	});

	// Fetch articles
	const articlesData = await getPayloadSDK(fetch).find({
		collection: 'posts',
		limit: 12,
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

	// Mix them together
	const items = [
		...modelsData.docs.map((model) => ({
			type: 'model' as const,
			id: `model-${model.id}`,
			title: model.model_meta.kit.title,
			image: model.model_meta.featuredImage,
			slug: `/models/${model.slug}`,
			meta: `${model.model_meta.kit.manufacturer.title} • ${model.model_meta.kit.scale.title}`
		})),
		...articlesData.docs.map((article) => ({
			type: 'article' as const,
			id: `article-${article.id}`,
			title: article.title,
			image: article.featuredImage,
			slug: `/articles/${article.slug}`,
			meta: article.category && typeof article.category === 'object' ? article.category.title : ''
		}))
	];

	// Shuffle for variety
	const shuffled = items.sort(() => Math.random() - 0.5);

	return {
		items: shuffled
	};
};
