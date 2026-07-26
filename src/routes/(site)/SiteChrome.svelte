<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import NavigationProgress from '$lib/components/NavigationProgress';
	import LastFmNowPlaying from '$lib/components/LastFmNowPlaying';
	import Footer from '$lib/components/Footer';
	import Header from '$lib/components/Header';
	import Meta from '$lib/components/meta/Meta';
	import Navigation from '$lib/components/navigation/Navigation';
	import GrungeOverlay from '$lib/components/GrungeOverlay';
	import AdminUtilitiesDock from '$lib/components/AdminUtilitiesDock';
	import TopBar from '$lib/components/TopBar';
	import type { LayoutCacheData } from '$lib/cache/layoutCache';
	import { layoutQueryOptions } from '$lib/query/queries';
	import { setSiteLayoutContext } from '$lib/query/siteLayoutContext';
	import type { Snippet } from 'svelte';

	interface Props {
		data: { initialLayout?: LayoutCacheData | null };
		children?: Snippet;
	}

	let { data, children }: Props = $props();

	// Navigation + siteMeta come straight from Payload (cached in IndexedDB via the
	// persisted QueryClient). SSR seeds `initialData`; the browser revalidates in
	// the background and this updates reactively when the CMS changes.
	const layoutQuery = createQuery(() => layoutQueryOptions(data.initialLayout));

	setSiteLayoutContext(() => ({
		navigation: layoutQuery.data?.navigation,
		siteMeta: layoutQuery.data?.siteMeta
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
		<LastFmNowPlaying />
		<AdminUtilitiesDock />
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
