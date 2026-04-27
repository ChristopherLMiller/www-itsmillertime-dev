<script lang="ts">
	import { page } from '$app/state';
	import Image from '$lib/components/Image.svelte';
	import Lexical from '$lib/Lexical.svelte';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import type { Media, Post, PostsTag } from '$lib/types/payload-types';
	import type { Snippet } from 'svelte';

	interface Props {
		article: Post;
		footer?: Snippet;
	}

	let { article, footer }: Props = $props();

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	const cmsEditHref = $derived(
		isAdmin && article.id != null
			? `${PUBLIC_PAYLOAD_URL}/admin/collections/posts/${article.id}`
			: null
	);

	function featuredMedia(post: Post): Media | null {
		const fi = post.featuredImage;
		if (fi && typeof fi === 'object') return fi as Media;
		return null;
	}

	const dateOpts: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	const pubRaw = $derived(article.originalPublicationDate ?? article.createdAt);
	const pubLabel = $derived(pubRaw ? new Date(pubRaw).toLocaleDateString('en-US', dateOpts) : '');
	const createdLabel = $derived(
		article.createdAt ? new Date(article.createdAt).toLocaleDateString('en-US', dateOpts) : ''
	);

	const categoryTitle = $derived(
		typeof article.category === 'object' && article.category?.title ? article.category.title : null
	);

	const featured = $derived(featuredMedia(article));

	function tagLabel(tag: number | PostsTag): string {
		if (typeof tag === 'object' && tag?.title) return tag.title;
		return String(tag);
	}

	function tagKey(tag: number | PostsTag, i: number): string | number {
		if (typeof tag === 'object' && tag?.id != null) return tag.id;
		return `${tag}-${i}`;
	}
</script>

<div class="article-landing">
	{#if featured}
		<div class="article-featured">
			<Image
				image={featured}
				transitionName={`article-featured-image-${article.slug}`}
				hasBorder
				objectFit="cover"
				sizes="(min-width: 768px) min(70vw, 720px), 100vw"
			/>
		</div>
	{:else}
		<hr class="article-rule" />
	{/if}

	<article class="article-body post contents">
		<h1
			class="article-title"
			style:view-transition-name={article.slug ? `article-headline-${article.slug}` : undefined}
		>
			{article.title}
		</h1>
		{#if pubLabel || createdLabel || categoryTitle || article.tags?.length}
			<div
				class="article-dateline"
				style:view-transition-name={article.slug ? `article-dateline-${article.slug}` : undefined}
			>
				{#if pubLabel || createdLabel || categoryTitle}
					<div class="article-meta" style:view-transition-name={`article-meta-${article.slug}`}>
						{#if pubLabel}
							<span style:view-transition-name={`article-pub-date-${article.slug}`}>
								Published on {pubLabel}
							</span>
						{/if}
						{#if pubLabel && createdLabel}
							<span class="article-meta-sep" aria-hidden="true">|</span>
						{/if}
						{#if createdLabel}
							<span>First written {createdLabel}</span>
						{/if}
						{#if categoryTitle}
							<span class="article-meta-sep" aria-hidden="true">|</span>
							<span style:view-transition-name={`article-category-${article.slug}`}>
								Filed under {categoryTitle}
							</span>
						{/if}
					</div>
				{/if}
				{#if article.tags?.length}
					<div
						class="article-tags"
						aria-label="Topics"
						style:view-transition-name={article.slug ? `article-tags-${article.slug}` : undefined}
					>
						{#each article.tags as tag, i (tagKey(tag, i))}
							<span class="article-tag">{tagLabel(tag)}</span>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		<div
			class="article-lexical"
			style:view-transition-name={article.slug ? `article-content-${article.slug}` : undefined}
		>
			<Lexical data={article.content as never} />
		</div>
	</article>

	{#if cmsEditHref}
		<p class="article-cms-edit">
			<a
				href={cmsEditHref}
				target="_blank"
				rel="noopener noreferrer"
				class="article-cms-edit-link"
				aria-label="Edit this post in the CMS (opens in a new tab)"
			>
				Edit in CMS
			</a>
		</p>
	{/if}

	{#if footer}
		<div class="article-footer">
			{@render footer()}
		</div>
	{/if}
</div>

<style lang="postcss">
	.article-landing {
		max-width: 100%;
	}

	.article-body > .article-title {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-m);
		font-weight: 700;
		color: #1a1a1a;
		text-align: center;
		line-height: 1.08;
		margin: 0 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.75px;
		break-after: avoid;
	}

	.article-dateline {
		border-top: 1px solid #ccc;
		border-bottom: 1px solid #ccc;
		padding: 0.65rem 0;
		margin: 0 0 0.85rem;
		break-after: avoid;
	}

	.article-dateline .article-meta {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		color: #555;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		line-height: 1.45;
		margin: 0 0 0.45rem;
		text-align: center;
	}

	.article-dateline .article-meta:last-child {
		margin-bottom: 0;
	}

	.article-dateline .article-tags {
		margin: 0;
		text-align: center;
		line-height: 1.6;
	}

	.article-dateline .article-tags .article-tag {
		display: inline-block;
		font-family: 'Times New Roman', Times, serif;
		font-size: calc(var(--fs-xs) * 0.8);
		padding: 0.1rem 0.3rem;
		margin: 0.1rem 0.15rem;
		background-color: #e5e3db;
		color: #555;
		font-style: italic;
		vertical-align: baseline;
	}

	.article-meta-sep {
		color: #aaa;
		font-weight: 400;
	}

	.article-featured {
		margin-bottom: 1rem;
		max-width: 100%;
	}

	.article-featured :global(.image-container) {
		max-width: 100%;
	}

	.article-rule {
		border: none;
		border-top: 1px solid #ccc;
		margin: 0 0 1rem;
	}

	.article-body {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		line-height: 1.42;
		color: #333;
		text-align: justify;
		padding-bottom: 1.5rem;
		margin-bottom: 0.5rem;
		margin-top: 0.35rem;
		border-bottom: 1px solid #ccc;
		column-count: 1;
		column-gap: 1.75rem;

		@media (min-width: 768px) {
			column-count: 2;
			column-rule: 1px solid #ddd;
		}
	}

	.article-lexical :global(p) {
		margin: 0 0 0.85rem;
	}

	.article-lexical :global(h1),
	.article-lexical :global(h2),
	.article-lexical :global(h3),
	.article-lexical :global(h4) {
		font-family: 'Times New Roman', Times, serif;
		color: #1a1a1a;
		break-after: avoid;
	}

	.article-lexical :global(a) {
		color: #8b0000;
	}

	.article-cms-edit {
		margin: 0 0 0.75rem;
		text-align: end;
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
	}

	.article-cms-edit-link {
		color: #8b0000;
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.06em;

		&:hover {
			text-decoration: underline;
		}
	}

	.article-footer {
		padding-top: 1rem;
		text-align: start;
		font-family: 'Times New Roman', Times, serif;
	}

	.article-footer :global(.share-buttons) {
		margin-top: 0.25rem;
		margin-bottom: 0.75rem;
	}
</style>
