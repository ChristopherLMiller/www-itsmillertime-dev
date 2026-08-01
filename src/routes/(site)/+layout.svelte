<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client';
	import { createQueryClient, LAYOUT_GC_TIME_MS } from '$lib/query/client';
	import { createIdbPersister, purgeLegacyPersistedQueryCaches } from '$lib/query/idbPersister';
	import { purgeCachedArticlesListing } from '$lib/pwa/resetStaleServiceWorker';
	import { queryPersistRestored } from '$lib/query/seedServerQuery';
	import { shouldPersistQuery } from '$lib/query/shouldPersistQuery';
	import SiteChrome from './SiteChrome.svelte';
	import type { LayoutProps } from './$types';
	import './styles.css';

	let { data, children }: LayoutProps = $props();

	const queryClient = createQueryClient();
	const persister = createIdbPersister();

	if (browser) {
		void purgeLegacyPersistedQueryCaches();
		void purgeCachedArticlesListing();
	}

	function markPersistSettled() {
		queryPersistRestored.set(true);
	}

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
		// Must be >= layout gcTime so nav/siteMeta survive IndexedDB restores indefinitely.
		maxAge: LAYOUT_GC_TIME_MS,
		// Bust caches written before article-list persistence was removed.
		buster: 'v4-no-article-list-persist',
		dehydrateOptions: {
			shouldDehydrateQuery: shouldPersistQuery
		}
	}}
	onSuccess={markPersistSettled}
	onError={markPersistSettled}
>
	<SiteChrome {data}>
		{@render children?.()}
	</SiteChrome>
</PersistQueryClientProvider>
