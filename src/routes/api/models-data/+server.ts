import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { modelsListQueryFromUrl } from '$lib/cache/modelCache';
import { loadModelsListPageData } from '$lib/cache/modelCache.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { url, fetch, request } = event;
	const query = modelsListQueryFromUrl(url);
	const includeNotStarted = isAdminRole(await getMergedSessionUser(event));

	const result = await loadModelsListPageData(query, {
		includeNotStarted,
		fetch,
		request
	});

	return json(result);
};
