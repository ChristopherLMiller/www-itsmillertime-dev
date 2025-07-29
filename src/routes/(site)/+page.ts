import { getPage } from '$lib/queries/getPage';

export async function load({ fetch }) {
	const page = await getPage(fetch, 'home');

	return {
		page: page,
		meta: page.meta
	};
}
