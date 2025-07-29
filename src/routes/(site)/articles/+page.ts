import { getArticles } from '$lib/queries/getArticles';
import type { PageLoad } from '../$types';

export const load: PageLoad = async ({ parent, fetch, url }) => {
	const { queryClient } = await parent();
	const queryParams = {
		page: url.searchParams.get('page') || 1,
		limit: url.searchParams.get('limit') || 15,
		category: url.searchParams.get('category') || null,
		sort: url.searchParams.get('sort') || '-publishedAt'
	};

	await queryClient.prefetchQuery({
		queryKey: ['articles', queryParams],
		queryFn: () => getArticles(fetch, queryParams)
	});
};
