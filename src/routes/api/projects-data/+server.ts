import { loadProjectsPageData } from '$lib/cache/projectCache.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 50;

	const { projects, meta } = await loadProjectsPageData(page, limit);

	return json({ projects, meta });
};
