<script lang="ts">
	import { browser } from '$app/environment';
	import { onNavigate } from '$app/navigation';
	import Footer from '$lib/Footer.svelte';
	import Header from '$lib/Header.svelte';
	import Meta from '$lib/meta/Meta.svelte';
	import Navigation from '$lib/navigation/Navigation.svelte';
	import TopBar from '$lib/TopBar.svelte';
	import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client';
	import './styles.css';

	let { children, data } = $props();

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((oldStateCaptureResolve) => {
			document.startViewTransition(async () => {
				oldStateCaptureResolve();
				await navigation.complete;
			});
		});
	});

	const persistor = createAsyncStoragePersister({
		storage: browser ? localStorage : undefined,
		key: 'svelte-query-cache'
	});

	const persistOptions = {
		maxAge: 1000 * 60 * 60 * 24,
		buster: 'v1.0.0',
		persister: persistor
	};
</script>

<QueryClientProvider client={data.queryClient}>
	<PersistQueryClientProvider client={data.queryClient} {persistOptions}>
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
		<SvelteQueryDevtools />
	</PersistQueryClientProvider>
</QueryClientProvider>

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
