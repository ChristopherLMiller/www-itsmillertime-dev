<script lang="ts">
	import GardenEntry from '$lib/components/GardenEntry.svelte';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	const title = $derived(data.garden.meta?.title ?? data.garden.name);
	const description = $derived(data.garden.meta?.description ?? undefined);
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<link rel="canonical" href={data.meta.canonicalURL} />
</svelte:head>

<div class="wrap">
	<p class="back">
		<a href="/garden">← Digital garden</a>
	</p>
	<GardenEntry garden={data.garden} />
</div>

<style lang="postcss">
	.wrap {
		max-width: var(--content-max-width, 960px);
		margin-inline: auto;
	}

	.back {
		margin: 0 0 1rem;
		font-size: var(--fs-sm, 0.875rem);
	}

	.back a {
		color: var(--color-primary-darker);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.back a:hover {
		color: var(--color-tertiary-darker);
	}
</style>
