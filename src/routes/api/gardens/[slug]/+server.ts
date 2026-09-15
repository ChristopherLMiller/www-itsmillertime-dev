import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { loadGardenPageData } from '$lib/cache/gardenCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!isAdminRole(user)) {
		throw error(403, 'Forbidden');
	}
	const { params, url, fetch, request } = event;
	const result = await loadGardenPageData(params.slug, url.origin, { fetch, request });
	if (!result) {
		throw error(404, 'Not found');
	}
	return json(result);
};
