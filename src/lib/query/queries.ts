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
	projects: (page: number, limit: number) => ['projects', page, limit] as const
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

export function articlesListQueryOptions(query: ArticlesListQuery, includeDrafts = false) {
	return {
		queryKey: queryKeys.articlesList(query, includeDrafts),
		queryFn: () => getJson<ArticlesListCacheData>(buildArticlesDataUrl(query)),
		enabled: browser
	};
}

export function articleQueryOptions(slug: string, includeDrafts = false) {
	return {
		queryKey: queryKeys.article(slug, includeDrafts),
		queryFn: () => getJson<ArticleCacheData>(`/api/articles/${slug}`),
		enabled: browser
	};
}

export function projectsQueryOptions(page: number, limit: number) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) });
	return {
		queryKey: queryKeys.projects(page, limit),
		queryFn: () => getJson<ProjectsCacheData>(`/api/projects-data?${q}`),
		enabled: browser
	};
}
