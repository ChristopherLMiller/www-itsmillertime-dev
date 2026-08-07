import { getParentSession } from '$lib/auth/parentSession';
import { isAdminRole } from '$lib/auth/requireAdmin.server';
import { articlesListQueryFromUrl } from '$lib/cache/articleCache';
import { loadArticlesListPageData } from '$lib/cache/articleListCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { url, fetch, request, parent } = event;
	const query = articlesListQueryFromUrl(url);
	const session = await getParentSession(parent);
	const includeDrafts = isAdminRole(session?.user ?? null);

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
