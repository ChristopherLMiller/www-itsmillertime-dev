import { loadParksPageData } from '$lib/cache/parksCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const initialParks = await loadParksPageData({ fetch, request });
	return { initialParks };
};
