import { browser } from '$app/environment';
import { getNavigation } from '$lib/queries/getNavigation';
import { getSiteMeta } from '$lib/queries/getSiteMeta';
import { QueryClient } from '@tanstack/svelte-query';

export async function load({ fetch }) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser
			}
		}
	});

	const navigation = await getNavigation(fetch);
	const siteMeta = await getSiteMeta(fetch);

	return { queryClient, navigation, siteMeta };
}
