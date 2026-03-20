<script lang="ts">
	import Lexical from '$lib/Lexical.svelte';
	import Panel from '$lib/Panel.svelte';
	import Image from '$lib/components/Image.svelte';
	import type { Garden } from '$lib/types/payload-types';

	let {
		garden,
		titleHref = null
	}: {
		garden: Garden;
		titleHref?: string | null;
	} = $props();

	const featured = $derived(
		garden.featuredImage && typeof garden.featuredImage === 'object' ? garden.featuredImage : null
	);
</script>

<article class="garden-entry">
	<Panel hasBorder hasPadding>
		<header class="header">
			{#if titleHref}
				<h2 class="title">
					<a href={titleHref}>{garden.name}</a>
				</h2>
			{:else}
				<h1 class="title title-page">{garden.name}</h1>
			{/if}
		</header>

		{#if featured}
			<div class="featured">
				<Image image={featured} hasBorder hasLightbox={false} />
			</div>
		{/if}

		{#if garden.content}
			<div class="lexical">
				<Lexical data={garden.content} />
			</div>
		{/if}
	</Panel>
</article>

<style lang="postcss">
	.lexical {
		margin-top: 1rem;
	}

	.header {
		margin-bottom: 0.5rem;
	}

	.title {
		font-family: var(--font-heading, inherit);
		font-size: var(--fs-xl, 1.25rem);
		font-weight: 600;
		margin: 0;
	}

	.title-page {
		font-size: var(--fs-2xl, 1.5rem);
	}

	.title a {
		color: var(--color-primary-darker);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.title a:hover {
		color: var(--color-tertiary-darker);
	}

	.featured {
		margin: 1rem 0;
		max-width: min(100%, 42rem);
	}
</style>
