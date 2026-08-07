import { getParentSession } from '$lib/auth/parentSession';
import { isAdminRole } from '$lib/auth/requireAdmin.server';
import { modelsListQueryFromUrl } from '$lib/cache/modelCache';
import { loadModelsListPageData } from '$lib/cache/modelCache.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { url, fetch, request, parent } = event;
	const query = modelsListQueryFromUrl(url);
	const session = await getParentSession(parent);
	const includeNotStarted = isAdminRole(session?.user ?? null);

	const initialModels = await loadModelsListPageData(query, {
		includeNotStarted,
		fetch,
		request
	});

	return { query, initialModels, includeNotStarted };
};
