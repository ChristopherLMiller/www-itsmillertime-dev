/**
 * Query keys and option factories for the site's Payload-backed data.
 *
 * Query functions fetch same-origin SvelteKit endpoints that proxy Payload
 * directly (no Redis). Because they use relative URLs they only run in the
 * browser; server-rendered routes supply `initialData` instead.
 */
import { browser } from '$app/environment';
import {
	buildArticlesDataUrl,
	type ArticleCacheData,
	type ArticlesListCacheData,
	type ArticlesListQuery
} from '$lib/cache/articleCache';
import type { LayoutCacheData } from '$lib/cache/layoutCache';
import {
	buildModelsDataUrl,
	type ModelCacheData,
	type ModelsListCacheData,
	type ModelsListQuery
} from '$lib/cache/modelCache';
import type { ProjectsCacheData } from '$lib/cache/projectCache';
import { LAYOUT_GC_TIME_MS } from '$lib/query/client';

async function getJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Request failed (${res.status}) for ${url}`);
	}
	return (await res.json()) as T;
}

export const queryKeys = {
	layout: ['layout'] as const,
	articlesList: (query: ArticlesListQuery, includeDrafts = false) =>
		['articles', 'list', query, { includeDrafts }] as const,
	article: (slug: string, includeDrafts = false) =>
		['article', slug, { includeDrafts }] as const,
	projects: (page: number, limit: number) => ['projects', page, limit] as const,
	modelsList: (query: ModelsListQuery, includeNotStarted = false) =>
		['models', 'list', query, { includeNotStarted }] as const,
	model: (slug: string, includeNotStarted = false) =>
		['model', slug, { includeNotStarted }] as const
};

export function layoutQueryOptions(initialData?: LayoutCacheData | null) {
	return {
		queryKey: queryKeys.layout,
		queryFn: () => getJson<LayoutCacheData>('/api/layout-data'),
		enabled: browser,
		gcTime: LAYOUT_GC_TIME_MS,
		placeholderData: (previousData: LayoutCacheData | undefined) => previousData,
		refetchOnMount: false,
		...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {})
	};
}

export function articlesListQueryOptions(
	query: ArticlesListQuery,
	includeDrafts = false,
	initialData?: ArticlesListCacheData | null
) {
	return {
		queryKey: queryKeys.articlesList(query, includeDrafts),
		queryFn: () => getJson<ArticlesListCacheData>(buildArticlesDataUrl(query)),
		enabled: browser,
		placeholderData: (previousData: ArticlesListCacheData | undefined) => previousData,
		...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {})
	};
}

export function articleQueryOptions(
	slug: string,
	includeDrafts = false,
	initialData?: ArticleCacheData | null
) {
	return {
		queryKey: queryKeys.article(slug, includeDrafts),
		queryFn: () => getJson<ArticleCacheData>(`/api/articles/${slug}`),
		enabled: browser,
		...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {})
	};
}

export function projectsQueryOptions(
	page: number,
	limit: number,
	initialData?: ProjectsCacheData | null
) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) });
	return {
		queryKey: queryKeys.projects(page, limit),
		queryFn: () => getJson<ProjectsCacheData>(`/api/projects-data?${q}`),
		enabled: browser,
		placeholderData: (previousData: ProjectsCacheData | undefined) => previousData,
		...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {})
	};
}

export function modelsListQueryOptions(
	query: ModelsListQuery,
	includeNotStarted = false,
	initialData?: ModelsListCacheData | null
) {
	return {
		queryKey: queryKeys.modelsList(query, includeNotStarted),
		queryFn: () => getJson<ModelsListCacheData>(buildModelsDataUrl(query)),
		enabled: browser,
		placeholderData: (previousData: ModelsListCacheData | undefined) => previousData,
		...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {})
	};
}

export function modelQueryOptions(
	slug: string,
	includeNotStarted = false,
	initialData?: ModelCacheData | null
) {
	return {
		queryKey: queryKeys.model(slug, includeNotStarted),
		queryFn: () => getJson<ModelCacheData>(`/api/models/${slug}`),
		enabled: browser,
		...(initialData ? { initialData, initialDataUpdatedAt: Date.now() } : {})
	};
}
