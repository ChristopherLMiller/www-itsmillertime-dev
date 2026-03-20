<script lang="ts">
	import GardenEntry from '$lib/components/GardenEntry.svelte';
	import Newspaper from '$lib/Newspaper.svelte';
	import type { Garden } from '$lib/types/payload-types';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	function hrefFor(g: Garden): string {
		return `/garden/${g.slug ?? g.id}`;
	}
</script>

<svelte:head>
	<title>Digital garden</title>
</svelte:head>

<Newspaper heading="Digital garden">
	<div class="garden-list">
		{#each data.gardens as garden (garden.id)}
			<GardenEntry {garden} titleHref={hrefFor(garden)} />
		{:else}
			<p class="empty">No notes yet.</p>
		{/each}
	</div>
</Newspaper>

<style lang="postcss">
	.garden-list {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.empty {
		color: var(--color-tertiary-darker);
		font-style: italic;
		margin: 0;
	}
</style>
