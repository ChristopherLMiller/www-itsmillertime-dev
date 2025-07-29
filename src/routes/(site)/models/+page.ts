import { getModels } from '$lib/queries/getModels';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const { queryClient } = await parent();
	const queryParams = {
		page: url.searchParams.get('page') || 1,
		limit: url.searchParams.get('limit') || 15
	};

	await queryClient.prefetchQuery({
		queryKey: ['models', queryParams],
		queryFn: () => getModels(fetch, queryParams)
	});
};
