<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import Panel from '$lib/Panel.svelte';
	import type { Snippet } from 'svelte';

	let {
		children,
		heading,
		subheading = null,
		image = null,
		columns = null,
		meta = null,
		footerContent = null,
		headingTransitionName = null,
		featuredImage = null,
		featuredImageTransitionName = null
	}: {
		children: Snippet;
		heading: string;
		subheading?: string | null;
		image?: { url: string; alt: string; width?: number; height?: number } | null;
		columns?: number | null;
		footerContent?: Snippet | null;
		meta?: Snippet | null;
		headingTransitionName?: string | null;
		featuredImage?: { url: string; alt: string; width?: number; height?: number } | null;
		featuredImageTransitionName?: string | null;
	} = $props();
</script>

<Panel hasBorder={true} hasPadding={true}>
	<h1 class="heading" style:view-transition-name={'newspaper-heading'}>
		{heading}
	</h1>
	<h2
		class="subheading"
		style:view-transition-name={headingTransitionName || 'newspaper-subheading'}
	>
		{subheading}
	</h2>
	{@render meta?.()}
	{#if featuredImage}
		<div class="featured-image">
			<Image
				transitionName={featuredImageTransitionName || 'newspaper-featured-image'}
				image={featuredImage}
				hasLightbox
				hasBorder
			/>
		</div>
	{:else}
		<hr />
	{/if}
	<div class="contents">
		<div class="columns" style:columns={columns || ''}>
			{#if image}
				<img
					src={image.url}
					alt={image.alt}
					style:width={image.width}
					style:height={image.height}
				/>
			{/if}
			{@render children?.()}
		</div>
	</div>
	<div class="footer">
		{@render footerContent?.()}
	</div>
</Panel>

<style lang="postcss">
	.heading {
		font-size: var(--fs-l);
		font-family: Garamond, serif;
		font-weight: 300;
		text-align: center;
		color: var(--color-primary);
		letter-spacing: 5px;
		line-height: 1em;
		padding-block: 1rem;
		margin-block-start: 1rem;
		border-top: 4px double var(--color-primary);
		border-bottom: 4px double var(--color-primary);
		margin-block-end: 2rem;
	}
	.subheading {
		font-size: var(--fs-m);
		color: var(--color-primary);
		font-weight: 100;
	}

	.featured-image {
		margin-block: 1rem;
	}

	.contents {
		padding-block-end: 2rem;
		border-bottom: 4px double var(--color-primary);
		text-align: justify;
		line-height: 1.5em;
		font-family: var(--font-special-elite);
	}

	.columns {
		column-rule: 2px solid var(--color-tertiary-lightest);
		column-width: 375px;

		@media screen and (max-width: 650px) {
			columns: 1 !important;
		}
	}

	img {
		margin-block-end: 2rem;
	}

	.footer {
		padding-block-start: 2rem;
		text-align: right;
	}
</style>
