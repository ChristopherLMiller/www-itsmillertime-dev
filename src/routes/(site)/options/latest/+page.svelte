<script lang="ts">
	import Panel from '$lib/Panel.svelte';
	import Image from '$lib/components/Image.svelte';
	import type { Media } from '$lib/types/payload-types';
	import { convertDate } from '../../../../utilities/convertDate';

	const { data } = $props();
</script>

<svelte:head>
	<title>Option 3: Latest of Everything</title>
</svelte:head>

<div class="latest-container">
	<header class="header">
		<h1>Christopher Miller</h1>
		<p>Latest from each corner of my creative life</p>
	</header>

	<div class="latest-grid">
		<!-- Latest Model -->
		{#if data.latestModel}
			<article class="latest-card model">
				<div class="card-image">
					<Image image={data.latestModel.model_meta.featuredImage as Media} />
				</div>
				<div class="card-body">
					<span class="card-category">🔨 Latest Build</span>
					<h2 class="card-title">
						<a href={`/models/${data.latestModel.slug}`}>
							{data.latestModel.model_meta.kit.title}
						</a>
					</h2>
					<p class="card-meta">
						{data.latestModel.model_meta.kit.manufacturer.title} • {data.latestModel.model_meta
							.kit.scale.title}
					</p>
					<p class="card-date">Updated {convertDate(data.latestModel.updatedAt)}</p>
					<a href="/models" class="card-link">View All Models →</a>
				</div>
			</article>
		{/if}

		<!-- Latest Photography -->
		<article class="latest-card photo placeholder">
			<div class="card-body">
				<span class="card-category">📷 Latest Photo</span>
				<h2 class="card-title">Photography Gallery</h2>
				<p class="card-meta">Coming soon - photos from hikes and travels</p>
				<a href="/galleries" class="card-link">Explore Gallery →</a>
			</div>
		</article>

		<!-- Latest Board Game -->
		<article class="latest-card game placeholder">
			<div class="card-body">
				<span class="card-category">🎲 Latest Game</span>
				<h2 class="card-title">Board Game Content</h2>
				<p class="card-meta">Reviews, session reports, and gaming thoughts</p>
				<a href="/articles" class="card-link">Read Articles →</a>
			</div>
		</article>

		<!-- Latest Article -->
		{#if data.latestArticle}
			<article class="latest-card article">
				{#if data.latestArticle.featuredImage}
					<div class="card-image">
						<Image image={data.latestArticle.featuredImage as Media} />
					</div>
				{/if}
				<div class="card-body">
					<span class="card-category">✍️ Latest Writing</span>
					<h2 class="card-title">
						<a href={`/articles/${data.latestArticle.slug}`}>
							{data.latestArticle.title}
						</a>
					</h2>
					{#if data.latestArticle.category && typeof data.latestArticle.category === 'object'}
						<p class="card-meta">{data.latestArticle.category.title}</p>
					{/if}
					<p class="card-date">
						{convertDate(data.latestArticle.publishedAt || data.latestArticle.createdAt)}
					</p>
					<a href="/articles" class="card-link">Read All Articles →</a>
				</div>
			</article>
		{/if}
	</div>
</div>

<style lang="postcss">
	.latest-container {
		min-height: 100vh;
		padding: 3rem 2rem;
		background: var(--color-white-lighter);
	}

	.header {
		text-align: center;
		max-width: 800px;
		margin: 0 auto 3rem;
		padding-bottom: 2rem;
		border-bottom: 3px solid var(--color-primary-darker);
	}

	.header h1 {
		font-family: var(--font-special-elite);
		font-size: clamp(2.5rem, 6vw, 4rem);
		color: var(--color-primary-darker);
		margin: 0 0 0.5rem 0;
	}

	.header p {
		font-family: var(--font-oswald);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0;
	}

	.latest-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.latest-card {
		border: 4px solid var(--color-primary-darker);
		background: white;
		display: flex;
		flex-direction: column;
		transition: all 0.3s ease;
		overflow: hidden;

		&:hover {
			transform: translateY(-6px);
			box-shadow: 8px 8px 0 var(--color-primary);
		}

		&.placeholder {
			background: linear-gradient(135deg, var(--color-tertiary-lighter), var(--color-tertiary));
			justify-content: center;
			min-height: 300px;

			.card-body {
				color: white;
			}

			.card-title,
			.card-meta,
			.card-link {
				color: white;
			}
		}
	}

	.card-image {
		width: 100%;
		height: 250px;
		overflow: hidden;
		border-bottom: 3px solid var(--color-primary-darker);
	}

	.card-image :global(.image-container) {
		height: 100%;
	}

	.card-image :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.card-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.card-category {
		font-family: var(--font-oswald);
		font-size: var(--fs-s);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-primary);
		font-weight: 700;
		margin-bottom: 0.75rem;
	}

	.card-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-l);
		margin: 0 0 0.5rem 0;
		line-height: 1.3;

		a {
			color: var(--color-primary-darker);
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	.card-meta {
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		color: var(--color-text);
		margin: 0 0 0.5rem 0;
	}

	.card-date {
		font-size: var(--fs-s);
		color: var(--color-text-light);
		margin: 0 0 1rem 0;
		font-style: italic;
	}

	.card-link {
		margin-top: auto;
		font-family: var(--font-oswald);
		font-size: var(--fs-m);
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 600;
		transition: color 0.2s ease;

		&:hover {
			color: var(--color-primary-darker);
		}
	}

	@media (max-width: 768px) {
		.latest-container {
			padding: 2rem 1rem;
		}

		.latest-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
