import type { Project } from '$lib/types/payload-types';

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
