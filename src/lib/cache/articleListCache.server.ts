import { cacheManager } from '$lib/cache/cache';
import {
	ARTICLES_LIST_CACHE_TTL_S,
	ARTICLE_STALE_THRESHOLD_S,
	articlesListCacheKey,
	articlesListQueriesMatch,
	type ArticlesListCacheData,
	type ArticlesListPagination,
	type ArticlesListQuery,
	normalizeArticlesQuery
} from '$lib/cache/articleCache';
import { unwrapSwrCache, wrapForSwrCache } from '$lib/cache/payloadSwrCore';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';

type CachedArticlesList = {
	data: ArticlesListCacheData;
	isStale: boolean;
};

async function getCachedArticlesList(
	query: ArticlesListQuery
): Promise<CachedArticlesList | null> {
	const redisKey = cacheManager.createKey(articlesListCacheKey(query));
	const raw = await cacheManager.get(redisKey);
	const unwrapped = unwrapSwrCache(raw, ARTICLE_STALE_THRESHOLD_S);
	if (!unwrapped) return null;

	const payload = unwrapped.data as ArticlesListCacheData;
	if (
		!payload?.articles ||
		!Array.isArray(payload.articles) ||
		!payload.pagination ||
		!payload.query ||
		!articlesListQueriesMatch(payload.query, query)
	) {
		return null;
	}

	return {
		data: payload,
		isStale: unwrapped.ageSeconds >= ARTICLE_STALE_THRESHOLD_S
	};
}

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

async function refreshArticlesListInBackground(
	query: ArticlesListQuery,
	redisKey: string
): Promise<void> {
	try {
		const payload = await fetchArticlesListFromCMS(query);
		await cacheManager.set(redisKey, wrapForSwrCache(payload), ARTICLES_LIST_CACHE_TTL_S);
	} catch (err) {
		console.error('[articles-list-cache] Background refresh failed:', err);
	}
}

export type ArticlesListPageDataResult = ArticlesListCacheData & {
	cacheStatus: 'HIT' | 'MISS';
};

export async function loadArticlesListPageData(
	pageRaw: number,
	limitRaw: number,
	categoryRaw?: string | null,
	tagRaw?: string | null,
	sortRaw?: string | null
): Promise<ArticlesListPageDataResult> {
	const query = normalizeArticlesQuery(pageRaw, limitRaw, categoryRaw, tagRaw, sortRaw);
	const redisKey = cacheManager.createKey(articlesListCacheKey(query));
	const cached = await getCachedArticlesList(query);

	if (cached) {
		if (cached.isStale) {
			refreshArticlesListInBackground(query, redisKey).catch(() => {});
		}
		return {
			...cached.data,
			cacheStatus: 'HIT'
		};
	}

	const payload = await fetchArticlesListFromCMS(query);
	await cacheManager.set(redisKey, wrapForSwrCache(payload), ARTICLES_LIST_CACHE_TTL_S);

	return {
		...payload,
		cacheStatus: 'MISS'
	};
}
