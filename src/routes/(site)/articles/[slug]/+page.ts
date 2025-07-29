import { getArticle } from '$lib/queries/getArticle';
import type { PageLoad } from '../$types';

export const load: PageLoad = async ({ parent, fetch, params }) => {
	const { queryClient } = await parent();

	const data = await queryClient.fetchQuery({
		queryKey: ['article', params.slug],
		queryFn: () => getArticle(fetch, params.slug)
	});

	return {
		meta: data?.meta
	};
};
