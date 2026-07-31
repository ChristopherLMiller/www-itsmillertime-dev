import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { loadArticlePageData } from '$lib/cache/articleCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { params, url, fetch, request } = event;
	const user = await getMergedSessionUser(event);
	const includeDrafts = isAdminRole(user);

	const result = await loadArticlePageData(params.slug, url.origin, {
		includeDrafts,
		fetch,
		request
	});
	if (!result) {
		throw error(404, 'Article not found');
	}

	return json(result);
};
