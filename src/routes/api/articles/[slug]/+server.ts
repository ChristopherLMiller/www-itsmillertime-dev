import { loadArticlePageData } from '$lib/cache/articleCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const result = await loadArticlePageData(params.slug, url.origin);
	if (!result) {
		throw error(404, 'Article not found');
	}

	const { cacheStatus, ...payload } = result;
	return json(payload, { headers: { 'X-Cache': cacheStatus } });
};
