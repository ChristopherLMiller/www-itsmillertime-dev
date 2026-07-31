import {
	normalizeArticlesQuery,
	type ArticlesListCacheData,
	type ArticlesListPagination,
	type ArticlesListQuery
} from '$lib/cache/articleCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';

export type ArticlesListLoadOptions = {
	/** When true, include draft posts (admin preview). Requires auth cookies via fetch/request. */
	includeDrafts?: boolean;
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

async function fetchArticlesListFromCMS(
	query: ArticlesListQuery,
	options: ArticlesListLoadOptions = {}
): Promise<ArticlesListCacheData> {
	const { includeDrafts = false, fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	const { page, limit, category, tag, sort } = query;

	const andFilters = [
		...(includeDrafts
			? []
			: [
					{
						_status: {
							not_equals: 'draft'
						}
					}
				]),
		...(category ? [{ 'category.slug': { equals: category } }] : []),
		...(tag ? [{ 'tags.slug': { equals: tag } }] : [])
	];

	const [postsData, categoriesData, tagsData] = await Promise.all([
		sdk.find({
			collection: 'posts',
			limit,
			page,
			sort,
			...(includeDrafts ? { draft: true } : {}),
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
				_status: true,
				meta: {
					title: true,
					description: true,
					image: true
				}
			},
			...(andFilters.length > 0
				? {
						where: {
							and: andFilters as never[]
						}
					}
				: {})
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
	sortRaw?: string | null,
	options: ArticlesListLoadOptions = {}
): Promise<ArticlesListCacheData> {
	const query = normalizeArticlesQuery(pageRaw, limitRaw, categoryRaw, tagRaw, sortRaw);
	return fetchArticlesListFromCMS(query, options);
}
