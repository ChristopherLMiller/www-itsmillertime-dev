import { loadParksPageData } from '$lib/cache/parksCache.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, request }) => {
	return json(await loadParksPageData({ fetch, request }));
};
