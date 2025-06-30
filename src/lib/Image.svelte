<script lang="ts">
	import type { Media } from './types/payload-types';

	const {
		image,
		transitionName,
		hasBorder = false
	}: { image: Media; transitionName?: string; hasBorder?: boolean } = $props();
	const aspectRatio = image?.width / image?.height;
</script>

<picture
	style:view-transition-name={transitionName}
	class={`${hasBorder ? 'border' : ''}`}
	style:aspect-ratio={`${aspectRatio > 1 ? aspectRatio : 1 / aspectRatio}`}
>
	{#if image?.sizes}
		{#each ['small', 'medium', 'large', 'xlarge'] as key}
			{#if image.sizes[key]?.url !== null}
				<source
					srcset={image.sizes[key]?.url}
					media={`(max-width: ${image?.sizes[key]?.width}px)"`}
					width={image?.sizes[key]?.width}
					height={image?.sizes[key]?.height}
					type={image?.sizes[key]?.mimeType}
					style:aspect-ratio={`${aspectRatio > 1 ? aspectRatio : 1 / aspectRatio}`}
				/>
			{/if}
		{/each}
	{/if}
	<img
		style:view-transition-name={transitionName}
		src={image?.sizes?.small?.url}
		width={image?.sizes?.small?.width}
		height={image?.sizes?.small?.height}
		alt={image?.alt}
		style:aspect-ratio={`${aspectRatio > 1 ? aspectRatio : 1 / aspectRatio}`}
	/>
</picture>

<style>
	picture {
		display: block;
		width: 100%;
		height: auto;
	}
	.border {
		border: 5px solid var(--color-primary-darker);
	}

	picture,
	source,
	img {
		object-fit: cover;
		object-position: center;
	}

	img {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
