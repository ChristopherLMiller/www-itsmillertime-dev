import { loadLayoutData } from '$lib/cache/layoutCache.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const data = await loadLayoutData();

	return json(data, {
		headers: {
			// Anonymous browsers / CDN may reuse briefly; IDB + TanStack own longer client cache.
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
		}
	});
};
