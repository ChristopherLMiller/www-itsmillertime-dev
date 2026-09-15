import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { loadGardensListPageData } from '$lib/cache/gardenCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!isAdminRole(user)) {
		throw error(403, 'Forbidden');
	}
	return json(await loadGardensListPageData({ fetch: event.fetch, request: event.request }));
};
