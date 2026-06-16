import type { Project } from '$lib/types/payload-types';

/** IndexedDB / Upstash key segment for a projects list query (prefix `payload:` in Redis). */
export function projectsListCacheKey(page: number, limit: number): string {
	return `projects:list:${page}:${limit}`;
}

export function projectsIdbKey(page: number, limit: number): string {
	return projectsListCacheKey(page, limit);
}

/** Serve from cache immediately; trigger a background refresh if older than this. */
export const PROJECTS_STALE_THRESHOLD_S = 5 * 60; // 5 minutes

/** Redis EXPIRE for the projects list payload. */
export const PROJECTS_CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days

export interface ProjectsListMeta {
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

export interface ProjectsCacheData {
	projects: Project[];
	meta: ProjectsListMeta;
}

export function normalizeProjectsQuery(pageRaw: number, limitRaw: number) {
	const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.floor(limitRaw)) : 50;
	return { page, limit };
}
