import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { loadModelPageData } from '$lib/cache/modelCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { params, url, fetch, request } = event;
	const includeNotStarted = isAdminRole(await getMergedSessionUser(event));

	const result = await loadModelPageData(params.slug, url.origin, {
		includeNotStarted,
		fetch,
		request
	});
	if (!result) {
		throw error(404, 'Model not found');
	}

	return json(result);
};
