import { getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { loadGalleryAlbumPageData } from '$lib/cache/galleryCache.server';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const { params, url, fetch, request } = event;
	const user = await getMergedSessionUser(event);
	const result = await loadGalleryAlbumPageData(params.slug, url.origin, {
		fetch,
		request,
		user
	});
	if (!result) {
		throw error(404, 'Album not found');
	}
	return json(result);
};
