<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import type { Media } from '$lib/types/payload-types';
	import { convertDate } from '../../../../utilities/convertDate';

	const { data } = $props();

	function getExcerpt(content: any): string {
		if (!content?.root?.children) return '';
		const firstParagraph = content.root.children.find((child: any) => child.type === 'paragraph');
		if (!firstParagraph?.children?.[0]?.text) return '';
		return firstParagraph.children[0].text.substring(0, 300) + '...';
	}

	function refreshPage() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Option 5: Random Feature</title>
</svelte:head>

<div class="random-container">
	<!-- Header -->
	<header class="site-header">
		<h1>Christopher Miller</h1>
		<p class="tagline">Builder • Photographer • Gamer • Writer</p>
		<button onclick={refreshPage} class="refresh-button">
			🎲 Show me something different
		</button>
	</header>

	<!-- Featured Item -->
	<section class="featured">
		<div class="featured-content">
			<div class="featured-image">
				{#if data.featuredItem.image}
					<Image image={data.featuredItem.image as Media} />
				{/if}
			</div>

			<div class="featured-text">
				<span class="featured-badge">
					{data.featuredItem.type === 'model' ? '🔨 Model Build' : '✍️ Article'}
				</span>
				<h2 class="featured-title">
					<a href={data.featuredItem.slug}>{data.featuredItem.title}</a>
				</h2>
				<p class="featured-meta">{data.featuredItem.meta}</p>
				{#if data.featuredItem.type === 'article' && data.featuredItem.content}
					<p class="featured-excerpt">{getExcerpt(data.featuredItem.content)}</p>
				{/if}
				<p class="featured-date">{convertDate(data.featuredItem.date)}</p>
				<a href={data.featuredItem.slug} class="featured-cta">
					{data.featuredItem.type === 'model' ? 'View Build Log' : 'Read Article'} →
				</a>
			</div>
		</div>
	</section>

	<!-- Navigation Grid -->
	<section class="navigation">
		<h3 class="navigation-title">Or explore by category</h3>
		<div class="nav-grid">
			<a href="/models" class="nav-card">
				<span class="nav-icon">🔨</span>
				<span class="nav-label">Scale Models</span>
			</a>
			<a href="/galleries" class="nav-card">
				<span class="nav-icon">📷</span>
				<span class="nav-label">Photography</span>
			</a>
			<a href="/articles" class="nav-card">
				<span class="nav-icon">🎲</span>
				<span class="nav-label">Board Games</span>
			</a>
			<a href="/articles" class="nav-card">
				<span class="nav-icon">✍️</span>
				<span class="nav-label">Writing</span>
			</a>
		</div>
	</section>

	<!-- Other Items -->
	{#if data.otherItems.length > 0}
		<section class="more-items">
			<h3 class="more-title">More from the archives</h3>
			<div class="more-grid">
				{#each data.otherItems as item}
					<a href={item.slug} class="more-card">
						{#if item.image}
							<div class="more-image">
								<Image image={item.image as Media} />
							</div>
						{/if}
						<div class="more-content">
							<span class="more-type">
								{item.type === 'model' ? '🔨' : '✍️'}
							</span>
							<h4 class="more-title-text">{item.title}</h4>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style lang="postcss">
	.random-container {
		min-height: 100vh;
		padding: 2rem;
		background: var(--color-white-lighter);
	}

	.site-header {
		text-align: center;
		max-width: 800px;
		margin: 0 auto 3rem;
		padding-bottom: 2rem;
		border-bottom: 3px solid var(--color-primary-darker);
	}

	.site-header h1 {
		font-family: var(--font-special-elite);
		font-size: clamp(2.5rem, 6vw, 4rem);
		color: var(--color-primary-darker);
		margin: 0 0 0.5rem 0;
	}

	.tagline {
		font-family: var(--font-oswald);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0 0 1.5rem 0;
	}

	.refresh-button {
		padding: 0.75rem 1.5rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		background: var(--color-secondary);
		color: white;
		border: 3px solid var(--color-primary-darker);
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 600;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 4px 4px 0 var(--color-primary-darker);
		}

		&:active {
			transform: translateY(0);
		}
	}

	.featured {
		max-width: 1200px;
		margin: 0 auto 4rem;
		border: 4px solid var(--color-primary-darker);
		background: white;
		overflow: hidden;
	}

	.featured-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0;
	}

	.featured-image {
		height: 100%;
		min-height: 400px;
	}

	.featured-image :global(.image-container) {
		height: 100%;
	}

	.featured-image :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.featured-text {
		padding: 3rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.featured-badge {
		font-family: var(--font-oswald);
		font-size: var(--fs-s);
		color: var(--color-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.featured-title {
		font-family: var(--font-special-elite);
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		margin: 0 0 0.5rem 0;
		line-height: 1.2;

		a {
			color: var(--color-primary-darker);
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.featured-meta {
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		color: var(--color-text);
		margin: 0 0 1rem 0;
	}

	.featured-excerpt {
		font-size: var(--fs-s);
		line-height: 1.7;
		color: var(--color-text);
		margin: 1rem 0;
	}

	.featured-date {
		font-size: var(--fs-s);
		color: var(--color-text-light);
		margin: 0.5rem 0 1.5rem 0;
		font-style: italic;
	}

	.featured-cta {
		display: inline-block;
		padding: 1rem 2rem;
		background: var(--color-primary);
		color: white;
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		text-decoration: none;
		border: 3px solid var(--color-primary-darker);
		transition: all 0.2s ease;
		font-weight: 600;
		align-self: flex-start;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 4px 4px 0 var(--color-primary-darker);
		}
	}

	.navigation {
		max-width: 1200px;
		margin: 0 auto 4rem;
	}

	.navigation-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-xl);
		text-align: center;
		color: var(--color-primary-darker);
		margin: 0 0 2rem 0;
	}

	.nav-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
	}

	.nav-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background: white;
		border: 3px solid var(--color-primary-darker);
		text-decoration: none;
		transition: all 0.2s ease;
		min-height: 140px;

		&:hover {
			transform: translateY(-4px);
			box-shadow: 6px 6px 0 var(--color-primary);
		}
	}

	.nav-icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	.nav-label {
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		color: var(--color-primary-darker);
		text-align: center;
		font-weight: 600;
	}

	.more-items {
		max-width: 1200px;
		margin: 0 auto;
	}

	.more-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-xl);
		text-align: center;
		color: var(--color-primary-darker);
		margin: 0 0 2rem 0;
	}

	.more-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.more-card {
		display: block;
		border: 3px solid var(--color-primary-darker);
		background: white;
		text-decoration: none;
		transition: all 0.2s ease;
		overflow: hidden;

		&:hover {
			transform: translateY(-4px);
			box-shadow: 4px 4px 0 var(--color-primary-lighter);
		}
	}

	.more-image {
		height: 150px;
		border-bottom: 2px solid var(--color-primary-darker);
	}

	.more-image :global(.image-container) {
		height: 100%;
	}

	.more-image :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.more-content {
		padding: 1rem;
	}

	.more-type {
		font-size: 1.5rem;
		display: block;
		margin-bottom: 0.5rem;
	}

	.more-title-text {
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		color: var(--color-primary-darker);
		margin: 0;
		line-height: 1.3;
	}

	@media (max-width: 1024px) {
		.featured-content {
			grid-template-columns: 1fr;
		}

		.nav-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.random-container {
			padding: 1rem;
		}

		.featured-text {
			padding: 2rem;
		}

		.nav-grid {
			grid-template-columns: 1fr;
		}

		.more-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
