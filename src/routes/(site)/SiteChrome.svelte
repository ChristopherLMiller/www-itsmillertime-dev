<script lang="ts">
	import { browser } from '$app/environment';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import NavigationProgress from '$lib/components/NavigationProgress';
	import LastFmNowPlayingLazy from '$lib/components/LastFmNowPlaying/LastFmNowPlayingLazy.svelte';
	import Footer from '$lib/components/Footer';
	import Header from '$lib/components/Header';
	import Meta from '$lib/components/meta/Meta';
	import Navigation from '$lib/components/navigation/Navigation';
	import GrungeOverlay from '$lib/components/GrungeOverlay';
	import AdminUtilitiesDockLazy from '$lib/components/AdminUtilitiesDock/AdminUtilitiesDockLazy.svelte';
	import TopBar from '$lib/components/TopBar';
	import ScrollToTop from '$lib/components/ScrollToTop';
	import type { LayoutCacheData } from '$lib/cache/layoutCache';
	import { layoutQueryOptions, queryKeys } from '$lib/query/queries';
	import { queryPersistRestored, seedServerQueryData } from '$lib/query/seedServerQuery';
	import { setSiteLayoutContext } from '$lib/query/siteLayoutContext';
	import type { Snippet } from 'svelte';

	interface Props {
		data: { initialLayout?: LayoutCacheData | null };
		children?: Snippet;
	}

	let { data, children }: Props = $props();

	const queryClient = useQueryClient();

	// Navigation + siteMeta: SSR + IndexedDB. refetchOnMount stays false so chrome
	// does not refetch on every remount; after IDB restore we re-seed SSR so this
	// navigation's layout is not stuck behind a stale persisted cache.
	const layoutQuery = createQuery(() => layoutQueryOptions(data.initialLayout));

	$effect(() => {
		if (!browser) return;
		void $queryPersistRestored;
		seedServerQueryData(queryClient, queryKeys.layout, data.initialLayout);
	});

	setSiteLayoutContext(() => ({
		navigation: layoutQuery.data?.navigation ?? data.initialLayout?.navigation,
		siteMeta: layoutQuery.data?.siteMeta ?? data.initialLayout?.siteMeta
	}));
</script>

<div class="site-foreground">
	<GrungeOverlay />
	<div class="site-content-layer">
		<NavigationProgress />
		<Meta />
		<TopBar />
		<Header />
		<Navigation />
		<div class="layout">
			<main>
				{@render children?.()}
			</main>
		</div>
		<Footer />
		<LastFmNowPlayingLazy />
		<ScrollToTop />
		<AdminUtilitiesDockLazy />
	</div>
</div>

<style lang="postcss">
	.site-foreground {
		position: relative;
		z-index: 1;
	}

	/* In-flow nodes (footer) paint under fixed z-0 without an explicit higher layer */
	.site-content-layer {
		position: relative;
		z-index: 1;
	}

	.layout {
		overscroll-behavior: none;
		display: grid;
		grid-template-rows: auto 1fr auto;
		grid-template-areas: 'header header header' 'l-sidebar nav r-sidebar' 'l-sidebar main r-sidebar' 'footer footer footer';
		grid-template-columns:
			[l-sidebar] minmax(var(--side-margins), auto) [main content] minmax(0, 1400px)
			[r-sidebar] minmax(var(--side-margins), auto);
	}

	main {
		grid-area: main;
		position: relative;
	}
</style>
