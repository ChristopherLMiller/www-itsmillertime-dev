import type { PageLoad } from '../$types';
import { getPayloadSDK } from '$lib/payload';

export const load: PageLoad = async ({ fetch, url }) => {
	const postsData = await getPayloadSDK(fetch).find({
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
						equals: undefined
					}
				},
				{
					'category.slug': {
						equals: url.searchParams.get('category') || undefined
					}
				}
			]
		}
	});

	console.log(postsData);
	const { docs: articles, ...meta } = postsData;

	return { articles, meta };
};
