import { loadCmsPageData } from '$lib/cache/pageCache.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, request, url }) => {
	const initialPage = await loadCmsPageData(params.slug, `${url.origin}/${params.slug}`, {
		fetch,
		request
	});
	if (!initialPage) {
		throw error(404, 'Page not found');
	}

	return {
		slug: params.slug,
		initialPage,
		meta: initialPage.meta
	};
};
