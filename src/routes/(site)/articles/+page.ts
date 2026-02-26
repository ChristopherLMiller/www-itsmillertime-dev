import type { PageLoad } from '../$types';
import { getPayloadSDK } from '$lib/payload';

export const load: PageLoad = async ({ fetch, url }) => {
	const sdk = getPayloadSDK(fetch);

	const [postsData, categoriesData, tagsData] = await Promise.all([
		sdk.find({
			collection: 'posts',
			limit: Number(url.searchParams.get('limit')) || 10,
			page: Number(url.searchParams.get('page')) || 1,
			sort: url.searchParams.get('sort') || '-publishedAt',
			select: {
				publishedAt: true,
				slug: true,
				word_count: true,
				content: true,
				title: true,
				featuredImage: true,
				createdAt: true,
				updatedAt: true,
				originalPublicationDate: true,
				category: true
			},
			where: {
				and: [
					{
						_status: {
							not_equals: 'draft'
						}
					},
					{
						'category.slug': {
							equals: url.searchParams.get('category') || undefined
						}
					}
				]
			}
		}),
		sdk.find({
			collection: 'posts-categories',
			limit: 100,
			sort: 'title'
		}),
		sdk.find({
			collection: 'posts-tags',
			limit: 100,
			sort: 'title'
		})
	]);

	console.log(postsData);
	const { docs: articles, ...meta } = postsData;
	const { docs: categories } = categoriesData;
	const { docs: tags } = tagsData;

	return { articles, meta, categories, tags };
};
