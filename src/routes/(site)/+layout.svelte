<script lang="ts">
	import { beforeNavigate, onNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client';
	import { createQueryClient, LAYOUT_GC_TIME_MS } from '$lib/query/client';
	import { createIdbPersister, purgeLegacyPersistedQueryCaches } from '$lib/query/idbPersister';
	import { purgeCachedArticlesListing } from '$lib/pwa/resetStaleServiceWorker';
	import { queryPersistRestored } from '$lib/query/seedServerQuery';
	import { shouldPersistQuery } from '$lib/query/shouldPersistQuery';
	import { rememberAdminReturnTo } from '$lib/admin/returnTo';
	import { startSessionKeepalive } from '$lib/auth/sessionKeepalive';
	import { navStore } from '../../stores/navigation';
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

	$effect(() => {
		if (!browser || !data.session?.user) return;
		return startSessionKeepalive();
	});

	function markPersistSettled() {
		queryPersistRestored.set(true);
	}

	beforeNavigate(({ to, from }) => {
		const dest = to?.url.pathname ?? '';
		if (dest !== '/admin' && !dest.startsWith('/admin/')) return;
		if (from?.url) rememberAdminReturnTo(from.url);
		navStore.close();
	});

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) return;
		// Skip expensive view transitions on constrained devices / user prefs.
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const conn = (
			navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
		).connection;
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

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400;1,600&family=Oswald:wght@400;500;600&family=Permanent+Marker&family=Roboto:wght@300;400;500&family=Source+Code+Pro:wght@400;500&family=Special+Elite&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

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
