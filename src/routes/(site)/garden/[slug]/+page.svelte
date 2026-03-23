<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import Lexical from '$lib/Lexical.svelte';
	import Panel from '$lib/Panel.svelte';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	const garden = $derived(data.garden);
	const title = $derived(garden.meta?.title ?? garden.name);
	const description = $derived(garden.meta?.description ?? undefined);
	const featured = $derived(
		garden.featuredImage && typeof garden.featuredImage === 'object' ? garden.featuredImage : null
	);
</script>

<svelte:head>
	<title>{title} | ItsMillerTime</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	<link rel="canonical" href={data.meta.canonicalURL} />
</svelte:head>

<div class="entry">
	<div class="header font-oswald">{garden.name}</div>
	<Panel hasPadding>
		{#if featured}
			<div class="featured">
				<Image image={featured} hasBorder hasLightbox={false} />
			</div>
		{/if}
		{#if garden.content}
			<Lexical data={garden.content} />
		{/if}
		<a class="back-link" href="/garden">← Back to Digital Garden</a>
	</Panel>
</div>

<style lang="postcss">
	.header {
		padding: 1rem;
		background: var(--color-tertiary-darker);
		color: var(--color-white);
	}

	.featured {
		margin-bottom: 1rem;
		max-width: min(100%, 42rem);
	}

	.back-link {
		display: inline-block;
		margin-top: 1.5rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-primary);
		text-decoration: none;

		&:hover {
			color: var(--color-secondary);
		}
	}
</style>
