import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { loadArticlePageData } from '$lib/cache/articleCache.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { params, url, fetch, request } = event;
	const includeDrafts = isAdminRole(await getMergedSessionUser(event));

	const initialArticle = await loadArticlePageData(params.slug, url.origin, {
		includeDrafts,
		fetch,
		request
	});
	if (!initialArticle) {
		throw error(404, 'Article not found');
	}

	return { slug: params.slug, initialArticle, includeDrafts };
};
