<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import type { Media } from '$lib/types/payload-types';

	const { data } = $props();
</script>

<svelte:head>
	<title>Option 1: Gallery Grid</title>
</svelte:head>

<div class="gallery-container">
	<header class="gallery-header">
		<h1>Christopher Miller</h1>
		<p>Models • Photography • Board Games • Writing</p>
	</header>

	<div class="masonry-grid">
		{#each data.items as item (item.id)}
			<a href={item.slug} class="gallery-item {item.type}">
				{#if item.image}
					<div class="item-image">
						<Image image={item.image as Media} />
					</div>
				{/if}
				<div class="item-overlay">
					<span class="item-badge">{item.type}</span>
					<h3 class="item-title">{item.title}</h3>
					{#if item.meta}
						<p class="item-meta">{item.meta}</p>
					{/if}
				</div>
			</a>
		{/each}
	</div>
</div>

<style lang="postcss">
	.gallery-container {
		min-height: 100vh;
		background: var(--color-white-lighter);
		padding: 2rem;
	}

	.gallery-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 3px solid var(--color-primary-darker);
	}

	.gallery-header h1 {
		font-family: var(--font-special-elite);
		font-size: clamp(2.5rem, 6vw, 4rem);
		color: var(--color-primary-darker);
		margin: 0 0 0.5rem 0;
	}

	.gallery-header p {
		font-family: var(--font-oswald);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0;
	}

	.masonry-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.gallery-item {
		position: relative;
		display: block;
		overflow: hidden;
		border: 3px solid var(--color-primary-darker);
		background: white;
		text-decoration: none;
		transition: all 0.3s ease;
		aspect-ratio: 1;

		&:hover {
			transform: translateY(-8px);
			box-shadow: 8px 8px 0 var(--color-primary);
			z-index: 10;

			.item-overlay {
				opacity: 1;
			}
		}
	}

	.item-image {
		width: 100%;
		height: 100%;
	}

	.item-image :global(.image-container) {
		height: 100%;
	}

	.item-image :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.item-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 50%, transparent 100%);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 1.5rem;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.gallery-item:hover .item-overlay {
		opacity: 1;
	}

	.item-badge {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: var(--color-secondary);
		color: white;
		padding: 0.25rem 0.75rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.gallery-item.model .item-badge {
		background: var(--color-primary);
	}

	.item-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-m);
		color: white;
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.item-meta {
		font-family: var(--font-oswald);
		font-size: var(--fs-s);
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
	}

	@media (max-width: 768px) {
		.gallery-container {
			padding: 1rem;
		}

		.masonry-grid {
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 1rem;
		}
	}
</style>
