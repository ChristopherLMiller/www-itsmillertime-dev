import { loadGardensListPageData } from '$lib/cache/gardenCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request }) => {
	const initialGardens = await loadGardensListPageData({ fetch, request });
	return { initialGardens };
};
