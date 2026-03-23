<script lang="ts">
	import Accordian from '$lib/components/Accordian.svelte';
	import Image from '$lib/components/Image.svelte';
	import Lexical from '$lib/Lexical.svelte';
	import Panel from '$lib/Panel.svelte';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Digital garden | ItsMillerTime</title>
</svelte:head>

<h1 class="heading font-permanent-marker">Digital Garden</h1>

<div class="garden-list">
	{#each data.gardens as garden (garden.id)}
		{@const featured =
			garden.featuredImage && typeof garden.featuredImage === 'object'
				? garden.featuredImage
				: null}

		<Accordian summary={garden.name}>
			<Panel hasPadding>
				{#if featured}
					<div class="featured">
						<Image image={featured} hasBorder hasLightbox={false} />
					</div>
				{/if}
				{#if garden.content}
					<Lexical data={garden.content} />
				{/if}
				<a class="entry-link" href="/garden/{garden.slug ?? garden.id}">View full page →</a>
			</Panel>
		</Accordian>
	{:else}
		<p class="empty">No notes yet.</p>
	{/each}
</div>

<style lang="postcss">
	.heading {
		font-size: var(--fs-l);
		color: var(--color-primary);
		text-align: center;
		margin: 0 0 1.5rem;
	}

	.garden-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.entry-content {
		padding: 1rem;
	}

	.featured {
		margin-bottom: 1rem;
		max-width: min(100%, 42rem);
	}

	.entry-link {
		display: inline-block;
		margin-top: 1rem;
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

	.empty {
		color: var(--color-tertiary-darker);
		font-style: italic;
		margin: 0;
	}
</style>
