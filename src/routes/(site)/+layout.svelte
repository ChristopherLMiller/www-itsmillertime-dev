<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client';
	import { createQueryClient, SWR_GC_TIME_MS } from '$lib/query/client';
	import { createIdbPersister } from '$lib/query/idbPersister';
	import { shouldPersistQuery } from '$lib/query/shouldPersistQuery';
	import SiteChrome from './SiteChrome.svelte';
	import type { LayoutProps } from './$types';
	import './styles.css';

	let { data, children }: LayoutProps = $props();

	const queryClient = createQueryClient();
	const persister = createIdbPersister();

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) return;
		// Skip expensive view transitions on constrained devices / user prefs.
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
			.connection;
		if (conn?.saveData) return;
		if (conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return;

		return new Promise((oldStateCaptureResolve) => {
			document.startViewTransition(async () => {
				oldStateCaptureResolve();
				await navigation.complete;
			});
		});
	});
</script>

<PersistQueryClientProvider
	client={queryClient}
	persistOptions={{
		persister,
		maxAge: SWR_GC_TIME_MS,
		// Bust caches written before article-body exclusion / shorter maxAge.
		buster: 'v2-no-article-bodies',
		dehydrateOptions: {
			shouldDehydrateQuery: shouldPersistQuery
		}
	}}
>
	<SiteChrome {data}>
		{@render children?.()}
	</SiteChrome>
</PersistQueryClientProvider>
