import { loadCmsPageData } from '$lib/cache/pageCache.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const initialPage = await loadCmsPageData('home', `${url.origin}/`, { fetch, request });
	if (!initialPage) {
		throw error(404, 'Page not found');
	}

	return {
		slug: 'home',
		initialPage,
		meta: initialPage.meta
	};
};
