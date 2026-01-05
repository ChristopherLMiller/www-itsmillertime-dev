<script lang="ts">
	import Panel from '$lib/Panel.svelte';
	import Image from '$lib/components/Image.svelte';
	import type { Media } from '$lib/types/payload-types';

	const { data } = $props();

	const categories = [
		{
			title: 'Scale Models',
			description: 'Detailed build logs and finished projects from my workbench',
			link: '/models',
			image: data.featuredModelImage,
			icon: '🔨'
		},
		{
			title: 'Photography',
			description: 'Capturing moments from hikes, travels, and everyday adventures',
			link: '/galleries',
			image: null,
			icon: '📷'
		},
		{
			title: 'Board Games',
			description: 'Reviews, session reports, and thoughts on tabletop gaming',
			link: '/articles?category=board-games',
			image: null,
			icon: '🎲'
		},
		{
			title: 'Writing',
			description: 'Articles about technology, creativity, and projects',
			link: '/articles',
			image: data.featuredArticleImage,
			icon: '✍️'
		}
	];
</script>

<svelte:head>
	<title>Option 2: Category Cards</title>
</svelte:head>

<div class="cards-container">
	<header class="intro">
		<h1>Christopher Miller</h1>
		<p class="tagline">Builder • Photographer • Gamer • Writer</p>
		<p class="description">
			Welcome to my corner of the internet where I share my various creative pursuits.
		</p>
	</header>

	<div class="category-grid">
		{#each categories as category}
			<a href={category.link} class="category-card">
				{#if category.image}
					<div class="card-image">
						<Image image={category.image as Media} />
					</div>
				{:else}
					<div class="card-image placeholder">
						<span class="placeholder-icon">{category.icon}</span>
					</div>
				{/if}
				<div class="card-content">
					<div class="card-icon">{category.icon}</div>
					<h2 class="card-title">{category.title}</h2>
					<p class="card-description">{category.description}</p>
					<span class="card-cta">Explore →</span>
				</div>
			</a>
		{/each}
	</div>
</div>

<style lang="postcss">
	.cards-container {
		min-height: 100vh;
		padding: 3rem 2rem;
		background: var(--color-white-lighter);
	}

	.intro {
		text-align: center;
		max-width: 800px;
		margin: 0 auto 4rem;
		padding-bottom: 2rem;
		border-bottom: 3px solid var(--color-primary-darker);
	}

	.intro h1 {
		font-family: var(--font-special-elite);
		font-size: clamp(2.5rem, 6vw, 4rem);
		color: var(--color-primary-darker);
		margin: 0 0 0.5rem 0;
	}

	.tagline {
		font-family: var(--font-oswald);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0 0 1rem 0;
		font-weight: 600;
	}

	.description {
		font-size: var(--fs-m);
		color: var(--color-text);
		margin: 0;
		line-height: 1.6;
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.category-card {
		display: block;
		position: relative;
		overflow: hidden;
		border: 4px solid var(--color-primary-darker);
		background: white;
		text-decoration: none;
		transition: all 0.3s ease;
		min-height: 400px;

		&:hover {
			transform: translateY(-8px);
			box-shadow: 12px 12px 0 var(--color-primary);

			.card-image {
				transform: scale(1.05);
			}

			.card-cta {
				transform: translateX(8px);
			}
		}
	}

	.card-image {
		position: absolute;
		inset: 0;
		transition: transform 0.3s ease;

		&.placeholder {
			background: linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary));
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.card-image :global(.image-container) {
		height: 100%;
	}

	.card-image :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: brightness(0.7);
	}

	.placeholder-icon {
		font-size: 6rem;
		opacity: 0.3;
	}

	.card-content {
		position: relative;
		z-index: 1;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 70%, transparent 100%);
		padding: 2rem;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		color: white;
	}

	.card-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.card-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-xl);
		margin: 0 0 0.75rem 0;
		color: white;
	}

	.card-description {
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		line-height: 1.5;
		margin: 0 0 1.5rem 0;
		color: rgba(255, 255, 255, 0.9);
	}

	.card-cta {
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		color: var(--color-secondary);
		font-weight: 700;
		transition: transform 0.3s ease;
	}

	@media (max-width: 768px) {
		.cards-container {
			padding: 2rem 1rem;
		}

		.category-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
