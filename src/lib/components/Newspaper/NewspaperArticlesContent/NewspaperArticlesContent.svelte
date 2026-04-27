<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import type { Media, Post, PostsTag } from '$lib/types/payload-types';
	import NewspaperLeadNoImage from '../NewspaperLeadNoImage/NewspaperLeadNoImage.svelte';
	import NewspaperLeadWithImage from '../NewspaperLeadWithImage/NewspaperLeadWithImage.svelte';
	import { getFirstParagraph } from '../../../../utilities/getFirstParagraph';

	interface Props {
		articles: Post[] | null;
	}

	let { articles }: Props = $props();

	/** Lead (1) + secondary grid (6) + three-column strip (3) — remainder → “More from this edition” */
	const SECONDARY_COUNT = 6;
	const COLUMN_COUNT = 3;
	const HERO_ARTICLE_COUNT = 1 + SECONDARY_COUNT + COLUMN_COUNT;

	const leadArticle = $derived(articles?.[0]);
	const secondaryArticles = $derived(articles?.slice(1, 1 + SECONDARY_COUNT) ?? []);
	const columnArticles = $derived(articles?.slice(1 + SECONDARY_COUNT, HERO_ARTICLE_COUNT) ?? []);
	const remainingArticles = $derived(articles?.slice(HERO_ARTICLE_COUNT) ?? []);

	function mediaFromPost(post: Post): Media | null {
		const fi = post.featuredImage;
		if (fi && typeof fi === 'object') return fi as Media;
		const mi = post.meta?.image;
		if (mi && typeof mi === 'object') return mi as Media;
		return null;
	}

	const leadFeaturedMedia = $derived(leadArticle ? mediaFromPost(leadArticle) : null);

	function firstParagraphText(post: Post): string {
		return getFirstParagraph(post.content) ?? '';
	}

	function formatPostDate(post: Post): string {
		const raw = post.originalPublicationDate || post.createdAt;
		if (!raw) return '';
		return new Date(raw).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function excerpt(post: Post, max = 220): string {
		const text = firstParagraphText(post);
		if (text.length <= max) return text;
		return `${text.slice(0, max).trimEnd()}…`;
	}

	function tagLabel(tag: number | PostsTag): string {
		if (typeof tag === 'object' && tag?.title) return tag.title;
		return String(tag);
	}

	function tagKey(tag: number | PostsTag, i: number): string | number {
		if (typeof tag === 'object' && tag?.id != null) return tag.id;
		return `${tag}-${i}`;
	}
</script>

{#if articles && articles.length > 0}
	<div class="newspaper-articles">
		{#if leadArticle?.slug}
			{#key leadArticle.slug}
				{#if leadFeaturedMedia}
					<NewspaperLeadWithImage article={leadArticle} image={leadFeaturedMedia} />
				{:else}
					<NewspaperLeadNoImage article={leadArticle} />
				{/if}
			{/key}
		{/if}

		{#if secondaryArticles.length > 0}
			<div class="secondary-headlines">
				{#each secondaryArticles as article (article.id)}
					{#if article.slug}
						<a href={`/articles/${article.slug}`} class="secondary-article">
							{#if mediaFromPost(article)}
								<div class="secondary-article-image">
									<Image
										image={mediaFromPost(article)!}
										objectFit="cover"
										sizes="(min-width: 768px) 18vw, 90vw"
										transitionName={`article-featured-image-${article.slug}`}
									/>
								</div>
							{/if}
							<div class="secondary-article-body">
								<div
									class="article-meta"
									style:view-transition-name={`article-meta-${article.slug}`}
								>
									<span style:view-transition-name={`article-category-${article.slug}`}>
										{typeof article.category === 'object' && article.category?.title
											? article.category.title
											: '—'}
									</span>
								</div>
								<h3
									class="secondary-article-title"
									style:view-transition-name={`article-headline-${article.slug}`}
								>
									{article.title}
								</h3>
								<p
									class="article-excerpt"
									style:view-transition-name={`article-content-${article.slug}`}
								>
									{excerpt(article, 280)}
								</p>
								{#if article.tags?.length}
									<div
										class="tags-inline"
										style:view-transition-name={`article-tags-${article.slug}`}
									>
										{#each article.tags as tag, i (tagKey(tag, i))}
											<span class="article-tag">{tagLabel(tag)}</span>
										{/each}
									</div>
								{/if}
							</div>
						</a>
					{/if}
				{/each}
			</div>
		{/if}

		{#if columnArticles.length > 0}
			<div class="columns-section">
				{#each columnArticles as article, index (article.id)}
					<div class="column">
						{#if article.slug}
							<a href={`/articles/${article.slug}`} class="column-article-link">
								{#if mediaFromPost(article)}
									<div class="column-article-image">
										<Image
											image={mediaFromPost(article)!}
											objectFit="cover"
											sizes="(min-width: 768px) 30vw, 100vw"
											transitionName={`article-featured-image-${article.slug}`}
										/>
									</div>
								{/if}
								<div
									class="article-meta"
									style:view-transition-name={`article-meta-${article.slug}`}
								>
									<span style:view-transition-name={`article-category-${article.slug}`}>
										{typeof article.category === 'object' && article.category?.title
											? article.category.title
											: '—'}
									</span>
									<span aria-hidden="true"> • </span>
									<span style:view-transition-name={`article-pub-date-${article.slug}`}>
										{formatPostDate(article)}
									</span>
								</div>
								<h3
									class="column-article-title"
									style:view-transition-name={`article-headline-${article.slug}`}
								>
									{article.title}
								</h3>
								<p
									class="article-excerpt"
									style:view-transition-name={`article-content-${article.slug}`}
								>
									{excerpt(article)}
								</p>
								{#if article.tags?.length}
									<div
										class="tags-inline"
										style:view-transition-name={`article-tags-${article.slug}`}
									>
										{#each article.tags as tag, i (tagKey(tag, i))}
											<span class="article-tag">{tagLabel(tag)}</span>
										{/each}
									</div>
								{/if}
							</a>
						{/if}
						{#if index < columnArticles.length - 1}
							<hr class="column-divider-mobile" />
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if remainingArticles.length > 0}
			<section class="more-stories" aria-labelledby="more-stories-heading">
				<h2 id="more-stories-heading" class="more-stories-heading">More from this edition</h2>
				<ul class="more-stories-list">
					{#each remainingArticles as article (article.id)}
						{#if article.slug}
							{@const dateStr = formatPostDate(article)}
							<li>
								<a href={`/articles/${article.slug}`} class="more-stories-link">
									<span
										class="more-stories-title"
										style:view-transition-name={`article-headline-${article.slug}`}
									>
										{article.title}
									</span>
									{#if dateStr}
										<span
											class="more-stories-date"
											style:view-transition-name={`article-pub-date-${article.slug}`}
										>
											{dateStr}
										</span>
									{/if}
								</a>
							</li>
						{/if}
					{/each}
				</ul>
			</section>
		{/if}
	</div>
{:else}
	<div class="no-results">
		<h3>No articles found</h3>
		<p>Try adjusting your filters to find more stories.</p>
	</div>
{/if}

<style lang="postcss">
	/*
	 * Shared typography for this page (also on .no-results so empty state matches).
	 * Body: --fs-base + body lh; titles: --fs-base + title lh; labels/meta: --fs-xs + meta tracking.
	 */
	.newspaper-articles,
	.no-results {
		--newspaper-body-lh: 1.45;
		--newspaper-title-lh: 1.22;
		--newspaper-meta-ls: 0.45px;
		--newspaper-section-heading-ls: 0.75px;
		--newspaper-multicol-gap: 1.35rem;
		--newspaper-tag-fs: calc(var(--fs-xs) * 0.85);
	}

	.tags-inline {
		display: flex;
		gap: 0.2rem;
		flex-wrap: wrap;
		margin-top: 0.35rem;
	}

	.article-tag {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--newspaper-tag-fs);
		line-height: var(--newspaper-body-lh);
		letter-spacing: var(--newspaper-meta-ls);
		padding: 0.1rem 0.3rem;
		background-color: #e5e3db;
		color: #555;
		font-style: italic;
	}

	.secondary-headlines {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.85rem 1rem;
		border-bottom: 1px solid #ccc;
		padding-bottom: 0.85rem;
		margin-bottom: 0.85rem;

		@media (min-width: 768px) {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem 1.25rem;
		}
	}

	@media (min-width: 768px) {
		.secondary-article:nth-child(odd):not(:last-child) {
			border-right: 1px solid #ccc;
			padding-right: 1rem;
		}
	}

	.secondary-article {
		container-type: inline-size;
		container-name: secondary-article;
		display: flow-root;
		text-decoration: none;
		color: inherit;

		&:hover .secondary-article-title {
			color: #8b0000;
		}
	}

	.secondary-article-body {
		min-width: 0;
	}

	.secondary-article-image {
		position: relative;
		width: 100%;
		border: 1px solid #ddd;
		overflow: hidden;
		margin-bottom: 0.65rem;
		aspect-ratio: 16 / 10;
	}

	@container secondary-article (min-width: 22rem) {
		.secondary-article-image {
			float: left;
			clear: left;
			width: clamp(7rem, 38cqw, 12rem);
			max-width: min(48%, 12rem);
			margin-right: 0.85rem;
			margin-bottom: 0.4rem;
			aspect-ratio: 1;
		}
	}

	.secondary-article-image :global(.image-container) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		aspect-ratio: unset !important;
	}

	.secondary-article-title {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		font-weight: 700;
		color: #1a1a1a;
		line-height: var(--newspaper-title-lh);
		margin-bottom: 0.35rem;
		transition: color 0.2s;
	}

	.article-meta {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		line-height: var(--newspaper-body-lh);
		color: #888;
		text-transform: uppercase;
		letter-spacing: var(--newspaper-meta-ls);
		margin-bottom: 0.35rem;
	}

	.article-excerpt {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		line-height: var(--newspaper-body-lh);
		color: #444;
		text-align: justify;
		margin: 0;
	}

	.columns-section {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.85rem;

		@media (min-width: 768px) {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.85rem 1.25rem;
		}
	}

	.column {
		@media (min-width: 768px) {
			border-right: 1px solid #ccc;
			padding-right: 1.25rem;

			&:last-child {
				border-right: none;
				padding-right: 0;
			}
		}
	}

	.column-article-link {
		text-decoration: none;
		color: inherit;
		display: block;

		&:hover .column-article-title {
			color: #8b0000;
		}
	}

	.column-article-image {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 10;
		margin-bottom: 0.45rem;
		border: 1px solid #ddd;
		overflow: hidden;
	}

	.column-article-image :global(.image-container) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		aspect-ratio: unset !important;
	}

	.column-article-title {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		font-weight: 700;
		color: #1a1a1a;
		line-height: var(--newspaper-title-lh);
		margin-bottom: 0.35rem;
		transition: color 0.2s;
	}

	.column-divider-mobile {
		border: none;
		border-top: 1px solid #ccc;
		margin: 0;

		@media (min-width: 768px) {
			display: none;
		}
	}

	.more-stories {
		margin-top: 0.85rem;
		padding-top: 0.85rem;
		border-top: 1px solid #ccc;
	}

	.more-stories-heading {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		font-weight: 700;
		line-height: var(--newspaper-title-lh);
		text-transform: uppercase;
		letter-spacing: var(--newspaper-section-heading-ls);
		color: #1a1a1a;
		margin: 0 0 0.55rem;
		text-align: center;
		border-bottom: 1px solid #ddd;
		padding-bottom: 0.35rem;
	}

	.more-stories-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.45rem 0.85rem;

		@media (min-width: 640px) {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.45rem 1.25rem;
		}

		@media (min-width: 960px) {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 640px) and (max-width: 959px) {
		.more-stories-list li:nth-child(odd):not(:last-child) {
			border-right: 1px solid #ccc;
			padding-right: 0.85rem;
		}
	}

	@media (min-width: 960px) {
		.more-stories-list li:nth-child(3n + 1):not(:last-child),
		.more-stories-list li:nth-child(3n + 2):not(:last-child) {
			border-right: 1px solid #ccc;
			padding-right: 0.85rem;
		}
	}

	.more-stories-link {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		text-decoration: none;
		color: #1a1a1a;
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		line-height: var(--newspaper-body-lh);
		padding: 0.22rem 0;
		border-bottom: 1px dotted #ccc;

		&:hover .more-stories-title {
			color: #8b0000;
		}
	}

	.more-stories-title {
		font-size: var(--fs-base);
		font-weight: 700;
		line-height: var(--newspaper-title-lh);
		transition: color 0.2s;
	}

	.more-stories-date {
		font-size: var(--fs-xs);
		line-height: var(--newspaper-body-lh);
		color: #888;
		text-transform: uppercase;
		letter-spacing: var(--newspaper-meta-ls);
	}

	.no-results {
		text-align: center;
		padding: 3rem var(--side-margins);
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		line-height: var(--newspaper-body-lh);
		color: #666;

		h3 {
			font-size: var(--fs-s);
			line-height: var(--newspaper-title-lh);
			margin-bottom: 0.5rem;
			color: #333;
		}

		p {
			font-size: var(--fs-base);
			line-height: var(--newspaper-body-lh);
			font-style: italic;
		}
	}
</style>
