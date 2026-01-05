import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Fetch several models
	const modelsData = await getPayloadSDK(fetch).find({
		collection: 'models',
		sort: '-updatedAt',
		limit: 10,
		select: {
			id: true,
			title: true,
			slug: true,
			updatedAt: true,
			model_meta: true
		}
	});

	// Fetch several articles
	const articlesData = await getPayloadSDK(fetch).find({
		collection: 'posts',
		limit: 10,
		sort: '-publishedAt',
		select: {
			publishedAt: true,
			slug: true,
			title: true,
			featuredImage: true,
			createdAt: true,
			content: true,
			category: true
		},
		where: {
			_status: {
				equals: undefined
			}
		}
	});

	// Combine into random pool
	const allItems = [
		...modelsData.docs.map((model) => ({
			type: 'model' as const,
			id: model.id,
			title: model.model_meta.kit.title,
			slug: `/models/${model.slug}`,
			image: model.model_meta.featuredImage,
			meta: `${model.model_meta.kit.manufacturer.title} • ${model.model_meta.kit.scale.title}`,
			date: model.updatedAt
		})),
		...articlesData.docs.map((article) => ({
			type: 'article' as const,
			id: article.id,
			title: article.title,
			slug: `/articles/${article.slug}`,
			image: article.featuredImage,
			meta: article.category && typeof article.category === 'object' ? article.category.title : '',
			date: article.publishedAt || article.createdAt,
			content: article.content
		}))
	];

	// Pick a random featured item
	const randomIndex = Math.floor(Math.random() * allItems.length);
	const featuredItem = allItems[randomIndex];

	// Get other items excluding the featured one
	const otherItems = allItems.filter((_, index) => index !== randomIndex).slice(0, 6);

	return {
		featuredItem,
		otherItems
	};
};
