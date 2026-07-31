import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { loadModelPageData } from '$lib/cache/modelCache.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { params, url, fetch, request } = event;
	const includeNotStarted = isAdminRole(await getMergedSessionUser(event));

	const initialModel = await loadModelPageData(params.slug, url.origin, {
		includeNotStarted,
		fetch,
		request
	});
	if (!initialModel) {
		throw error(404, 'Model not found');
	}

	return {
		slug: params.slug,
		initialModel,
		includeNotStarted,
		/** Keep top-level meta for SSR `<Meta>` before pageMetaOverride runs. */
		meta: initialModel.meta
	};
};
