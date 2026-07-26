<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { PersistQueryClientProvider } from '@tanstack/svelte-query-persist-client';
	import { createQueryClient, SWR_GC_TIME_MS } from '$lib/query/client';
	import { createIdbPersister } from '$lib/query/idbPersister';
	import SiteChrome from './SiteChrome.svelte';
	import type { LayoutProps } from './$types';
	import './styles.css';

	let { data, children }: LayoutProps = $props();

	const queryClient = createQueryClient();
	const persister = createIdbPersister();

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

<PersistQueryClientProvider
	client={queryClient}
	persistOptions={{ persister, maxAge: SWR_GC_TIME_MS }}
>
	<SiteChrome {data}>
		{@render children?.()}
	</SiteChrome>
</PersistQueryClientProvider>
