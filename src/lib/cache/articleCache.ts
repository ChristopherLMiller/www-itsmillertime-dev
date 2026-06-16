import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';

/** IndexedDB key per article slug; Upstash uses `article:{id}` with the `payload:` prefix. */
export function articleIdbKey(slug: string): string {
	return `article:slug:${slug}`;
}

export function articleRedisKey(articleId: number | string): string {
	return `article:${articleId}`;
}

/** Default query parameters applied when URL params are omitted. */
export const ARTICLES_LIST_DEFAULTS = {
	sort: '-publishedAt',
	page: 1,
	limit: 25,
	category: '',
	tag: ''
} as const;

export type ArticlesListQuery = {
	sort: string;
	page: number;
	limit: number;
	category: string;
	tag: string;
};

const UNSET_FILTER = '_';

/**
 * Redis + IndexedDB key for an articles list query.
 * Always includes sort, page, limit, category, and tag (defaults applied; unset filters use "_").
 */
export function articlesListCacheKey(query: ArticlesListQuery): string {
	const category = query.category || UNSET_FILTER;
	const tag = query.tag || UNSET_FILTER;
	return `articles:list:sort:${query.sort}:page:${query.page}:limit:${query.limit}:category:${category}:tag:${tag}`;
}

/** Alias — browser cache uses the same key shape as Upstash. */
export const articlesListIdbKey = articlesListCacheKey;

/** Serve from cache immediately; trigger a background refresh if older than this. */
export const ARTICLE_STALE_THRESHOLD_S = 5 * 60; // 5 minutes

/** Redis EXPIRE for individual article payloads. */
export const ARTICLE_CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days

/** Redis EXPIRE for articles list payloads. */
export const ARTICLES_LIST_CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days

export type ArticlePageMeta = NonNullable<Post['meta']> & {
	canonicalURL: string;
};

export interface ArticleCacheData {
	article: Post;
	meta: ArticlePageMeta;
}

export interface ArticlesListPagination {
	totalDocs: number;
	limit: number;
	totalPages: number;
	page: number;
	pagingCounter: number;
	hasPrevPage: boolean;
	hasNextPage: boolean;
	prevPage: number | null;
	nextPage: number | null;
}

export interface ArticlesListCacheData {
	/** Normalized query this payload was fetched with (defaults applied). */
	query: ArticlesListQuery;
	articles: Post[];
	pagination: ArticlesListPagination;
	categories: PostsCategory[];
	tags: PostsTag[];
}

export function normalizeArticlesQuery(
	pageRaw: number,
	limitRaw: number,
	categoryRaw?: string | null,
	tagRaw?: string | null,
	sortRaw?: string | null
): ArticlesListQuery {
	const page =
		Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : ARTICLES_LIST_DEFAULTS.page;
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0
			? Math.min(100, Math.floor(limitRaw))
			: ARTICLES_LIST_DEFAULTS.limit;
	const category = categoryRaw?.trim() || ARTICLES_LIST_DEFAULTS.category;
	const tag = tagRaw?.trim() || ARTICLES_LIST_DEFAULTS.tag;
	const sort = sortRaw?.trim() || ARTICLES_LIST_DEFAULTS.sort;
	return { page, limit, category, tag, sort };
}

export function articlesListQueryFromUrl(url: URL): ArticlesListQuery {
	return normalizeArticlesQuery(
		Number(url.searchParams.get('page')) || ARTICLES_LIST_DEFAULTS.page,
		Number(url.searchParams.get('limit')) || ARTICLES_LIST_DEFAULTS.limit,
		url.searchParams.get('category'),
		url.searchParams.get('tag'),
		url.searchParams.get('sort')
	);
}

export function articlesListQueriesMatch(a: ArticlesListQuery, b: ArticlesListQuery): boolean {
	return (
		a.sort === b.sort &&
		a.page === b.page &&
		a.limit === b.limit &&
		a.category === b.category &&
		a.tag === b.tag
	);
}

export function buildArticlesDataUrl(query: ArticlesListQuery): string {
	const q = new URLSearchParams({
		page: String(query.page),
		limit: String(query.limit),
		sort: query.sort
	});
	if (query.category) q.set('category', query.category);
	if (query.tag) q.set('tag', query.tag);
	return `/api/articles-data?${q}`;
}
