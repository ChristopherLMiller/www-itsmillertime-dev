import { getModel } from '$lib/queries/getModel';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, fetch, params }) => {
	const { queryClient } = await parent();

	const data = await queryClient.fetchQuery({
		queryKey: ['model', params.slug],
		queryFn: () => getModel(fetch, params.slug)
	});

	return {
		meta: data.meta
	};
};
