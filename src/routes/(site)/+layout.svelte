<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate, onNavigate } from '$app/navigation';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';
	import LastFmNowPlaying from '$lib/components/LastFmNowPlaying.svelte';
	import Footer from '$lib/Footer.svelte';
	import Header from '$lib/Header.svelte';
	import Meta from '$lib/meta/Meta.svelte';
	import Navigation from '$lib/navigation/Navigation.svelte';
	import AdminUtilitiesDock from '$lib/components/AdminUtilitiesDock.svelte';
	import TopBar from '$lib/TopBar.svelte';
	import { browserCache, LAYOUT_CACHE_KEY } from '$lib/cache/browserCache';
	import { isSilentRefresh } from '$lib/stores/silentRefresh';
	import './styles.css';

	let { children, data } = $props();

	// Guard against concurrent background refreshes.
	let isRefreshing = $state(false);

	// Persist fresh layout data to IndexedDB so subsequent client-side loads are instant.
	$effect(() => {
		if (browser && !data._isFromCache) {
			void browserCache.set(LAYOUT_CACHE_KEY, {
				navigation: data.navigation,
				siteMeta: data.siteMeta
			});
		}
	});

	// When we served stale cached data, trigger a silent background refresh.
	// Clears the IDB entry first so the next load() call fetches fresh data,
	// then calls invalidate() with the progress bar suppressed.
	$effect(() => {
		if (!browser || !data._isFromCache || data._cacheIsFresh || isRefreshing) return;

		isRefreshing = true;

		async function doSilentRefresh() {
			await browserCache.clear(LAYOUT_CACHE_KEY);
			isSilentRefresh.set(true);
			try {
				await invalidate('app:layout');
			} finally {
				isSilentRefresh.set(false);
				isRefreshing = false;
			}
		}

		void doSilentRefresh();
	});

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((oldStateCaptureResolve) => {
			document.startViewTransition(async () => {
				oldStateCaptureResolve();
				await navigation.complete;
			});
		});
	});
</script>

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

<style lang="postcss">
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
