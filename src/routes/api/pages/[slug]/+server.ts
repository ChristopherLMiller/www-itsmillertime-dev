import { loadCmsPageData } from '$lib/cache/pageCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, fetch, request }) => {
	const result = await loadCmsPageData(
		params.slug,
		params.slug === 'home' ? `${url.origin}/` : `${url.origin}/${params.slug}`,
		{ fetch, request }
	);
	if (!result) {
		throw error(404, 'Page not found');
	}
	return json(result);
};
