import { loadProjectsPageData } from '$lib/cache/projectCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 50;
	const initialProjects = await loadProjectsPageData(page, limit);

	return {
		page: initialProjects.page,
		limit: initialProjects.limit,
		initialProjects: {
			projects: initialProjects.projects,
			meta: initialProjects.meta
		}
	};
};
