import { galleriesListQueryFromUrl } from '$lib/cache/galleryCache';
import { loadGalleriesListPageData } from '$lib/cache/galleryCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, url, depends }) => {
	depends('app:galleries-list');
	const query = galleriesListQueryFromUrl(url);
	const initialGalleries = await loadGalleriesListPageData(
		query.page,
		query.limit,
		query.category,
		query.tag,
		{ fetch, request }
	);

	return { query, initialGalleries };
};
