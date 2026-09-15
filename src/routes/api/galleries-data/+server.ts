import { galleriesListQueryFromUrl } from '$lib/cache/galleryCache';
import { loadGalleriesListPageData } from '$lib/cache/galleryCache.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch, request }) => {
	const query = galleriesListQueryFromUrl(url);
	return json(
		await loadGalleriesListPageData(query.page, query.limit, query.category, query.tag, {
			fetch,
			request
		})
	);
};
