import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';

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

export type ArticlePageMeta = NonNullable<Post['meta']> & {
	canonicalURL: string;
};

export type ArticleRelatedModel = {
	id: number;
	title: string;
	slug: string;
};

export interface ArticleCacheData {
	article: Post;
	meta: ArticlePageMeta;
	/** Models linked via post.relatedModels and/or model.relatedPosts */
	relatedModels?: ArticleRelatedModel[];
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
