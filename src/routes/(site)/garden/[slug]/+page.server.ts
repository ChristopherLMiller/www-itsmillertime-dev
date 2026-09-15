import { loadGardenPageData } from '$lib/cache/gardenCache.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, params, url }) => {
	const initialGarden = await loadGardenPageData(params.slug, url.origin, { fetch, request });
	if (!initialGarden) {
		error(404, 'Not found');
	}

	return {
		slug: params.slug,
		initialGarden,
		meta: initialGarden.meta
	};
};
