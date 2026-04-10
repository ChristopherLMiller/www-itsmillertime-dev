import { getPayloadSDK } from '$lib/payload';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url, request }) => {
	const sdk = getPayloadSDK(fetch, request);

	const categorySlug = url.searchParams.get('category') || undefined;
	const tagSlug = url.searchParams.get('tag') || undefined;

	const andFilters = [
		{
			_status: {
				not_equals: 'draft'
			}
		},
		...(categorySlug ? [{ 'category.slug': { equals: categorySlug } }] : []),
		...(tagSlug ? [{ 'tags.slug': { equals: tagSlug } }] : [])
	];

	const limitParam = Number(url.searchParams.get('limit'));
	const pageSize = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 25;
	const pageSizeClamped = Math.min(100, Math.max(1, pageSize));

	const [postsData, categoriesData, tagsData] = await Promise.all([
		sdk.find({
			collection: 'posts',
			limit: pageSizeClamped,
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
				category: true,
				tags: true,
				meta: {
					title: true,
					description: true,
					image: true
				}
			},
			where: {
				and: andFilters as never[]
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

	const { docs: articles, ...pagination } = postsData;
	const { docs: categories } = categoriesData;
	const { docs: tags } = tagsData;

	return { articles, pagination, categories, tags };
};
