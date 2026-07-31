import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { articlesListQueryFromUrl } from '$lib/cache/articleCache';
import { loadArticlesListPageData } from '$lib/cache/articleListCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { url, fetch, request } = event;
	const query = articlesListQueryFromUrl(url);
	const includeDrafts = isAdminRole(await getMergedSessionUser(event));

	const initialArticles = await loadArticlesListPageData(
		query.page,
		query.limit,
		query.category || undefined,
		query.tag || undefined,
		query.sort,
		{ includeDrafts, fetch, request }
	);

	return { query, initialArticles, includeDrafts };
};
