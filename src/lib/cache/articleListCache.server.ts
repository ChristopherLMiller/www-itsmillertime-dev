import {
	normalizeArticlesQuery,
	type ArticlesListCacheData,
	type ArticlesListPagination,
	type ArticlesListQuery
} from '$lib/cache/articleCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';

async function fetchArticlesListFromCMS(query: ArticlesListQuery): Promise<ArticlesListCacheData> {
	const sdk = getPayloadSDK();
	const { page, limit, category, tag, sort } = query;

	const andFilters = [
		{
			_status: {
				not_equals: 'draft'
			}
		},
		...(category ? [{ 'category.slug': { equals: category } }] : []),
		...(tag ? [{ 'tags.slug': { equals: tag } }] : [])
	];

	const [postsData, categoriesData, tagsData] = await Promise.all([
		sdk.find({
			collection: 'posts',
			limit,
			page,
			sort,
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

	return {
		query,
		articles: articles as Post[],
		pagination: pagination as ArticlesListPagination,
		categories: categoriesData.docs as PostsCategory[],
		tags: tagsData.docs as PostsTag[]
	};
}

export async function loadArticlesListPageData(
	pageRaw: number,
	limitRaw: number,
	categoryRaw?: string | null,
	tagRaw?: string | null,
	sortRaw?: string | null
): Promise<ArticlesListCacheData> {
	const query = normalizeArticlesQuery(pageRaw, limitRaw, categoryRaw, tagRaw, sortRaw);
	return fetchArticlesListFromCMS(query);
}
