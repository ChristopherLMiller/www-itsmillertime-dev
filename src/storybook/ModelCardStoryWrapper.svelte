<script lang="ts">
	import { onDestroy } from 'svelte';
	import ModelCard from '$lib/components/ModelCard.svelte';
	import type { Model } from '$lib/types/payload-types';

	let { model }: { model: Model } = $props();

	const origFetch = globalThis.fetch.bind(globalThis);
	globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
		if (String(input).includes('/api/clockify/')) {
			return Promise.resolve(
				new Response(JSON.stringify({ duration: 3_600_000 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			);
		}
		return origFetch(input, init);
	};

	onDestroy(() => {
		globalThis.fetch = origFetch;
	});
</script>

<ModelCard {model} />
