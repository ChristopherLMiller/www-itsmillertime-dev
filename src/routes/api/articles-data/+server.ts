import { loadArticlesListPageData } from '$lib/cache/articleListCache.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 25;
	const category = url.searchParams.get('category') || undefined;
	const tag = url.searchParams.get('tag') || undefined;
	const sort = url.searchParams.get('sort') || undefined;

	const result = await loadArticlesListPageData(page, limit, category, tag, sort);
	const { cacheStatus, ...payload } = result;

	return json(payload, { headers: { 'X-Cache': cacheStatus } });
};
