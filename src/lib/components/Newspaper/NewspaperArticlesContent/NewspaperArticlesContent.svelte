<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import NodeRenderer from '$lib/NodeRenderer.svelte';
	import type { Media, Post, PostsTag } from '$lib/types/payload-types';
	import { tick } from 'svelte';
	import {
		getFirstParagraph,
		getLeadingParagraphBlocks,
		mapRestPrefixToParagraphParts
	} from '../../../../utilities/getFirstParagraph';
	import {
		paragraphNodeToPlainTextOnly,
		processLexicalNode,
		stripFirstCharacterFromParagraphNode
	} from '../../../../utilities/lexicalProcessNode';

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
	const columnArticles = $derived(
		articles?.slice(1 + SECONDARY_COUNT, HERO_ARTICLE_COUNT) ?? []
	);
	const remainingArticles = $derived(articles?.slice(HERO_ARTICLE_COUNT) ?? []);

	const dateOpts: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	const leadPubLabel = $derived(
		leadArticle && (leadArticle.originalPublicationDate || leadArticle.createdAt)
			? new Date(
					leadArticle.originalPublicationDate ?? leadArticle.createdAt!
				).toLocaleDateString('en-US', dateOpts)
			: ''
	);

	const leadCreatedLabel = $derived(
		leadArticle?.createdAt
			? new Date(leadArticle.createdAt).toLocaleDateString('en-US', dateOpts)
			: ''
	);

	const leadCategoryTitle = $derived(
		leadArticle && typeof leadArticle.category === 'object' && leadArticle.category?.title
			? leadArticle.category.title
			: null
	);

	/** Height of image + caption column; used to cap lead text on two-column layout */
	let leadImageColHeight = $state(0);

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

	const leadBlocks = $derived(
		leadArticle ? getLeadingParagraphBlocks(leadArticle.content, { maxChars: 16000, maxParagraphs: 50 }) : []
	);

	/** Joined plain text for clamp measurement (matches Lexical paragraph order) */
	const leadParaFull = $derived(leadBlocks.map((b) => b.plain).join('\n\n'));
	const leadParaRest = $derived(leadParaFull.length > 1 ? leadParaFull.slice(1) : '');

	let leadTextEl: HTMLDivElement | undefined = $state();
	/** Plain rest after drop cap (for height clamp); may end with … when clamped */
	let leadBodyRestDisplay = $state('');

	const leadParagraphMap = $derived.by(() => {
		const plains = leadBlocks.map((b) => b.plain);
		const raw = leadBodyRestDisplay.replace(/\u2026$/, '');
		const prefix = raw.length > 0 ? raw : leadParaRest;
		return mapRestPrefixToParagraphParts(prefix, plains);
	});

	const leadTruncatedWithEllipsis = $derived(
		leadBodyRestDisplay.length > 0 && /\u2026$/.test(leadBodyRestDisplay)
	);

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

	/** Max characters of `fullRest` that fit in the lead text column (clone + binary search). */
	function maxRestLengthThatFits(container: HTMLElement, fullRest: string): number {
		if (!fullRest.length) return 0;
		const w = container.offsetWidth;
		if (w < 8) return fullRest.length;

		const clone = container.cloneNode(true) as HTMLElement;
		clone.style.cssText = [
			'position:absolute',
			'left:-9999px',
			'top:0',
			'visibility:hidden',
			'pointer-events:none',
			`width:${w}px`
		].join(';');
		const cs = getComputedStyle(container);
		/* Match the real box: fixed height when aligned to image, or flex-sized lead flow (no image) */
		if (cs.height && cs.height !== 'auto') clone.style.height = cs.height;
		else if (cs.maxHeight && cs.maxHeight !== 'none') clone.style.maxHeight = cs.maxHeight;

		document.body.appendChild(clone);
		const textSpan = clone.querySelector('.main-headline-lead-clamp-mirror');
		if (!textSpan) {
			document.body.removeChild(clone);
			return fullRest.length;
		}

		textSpan.textContent = fullRest;
		const fits = (el: HTMLElement) => el.scrollHeight <= el.clientHeight + 1;

		if (fits(clone)) {
			document.body.removeChild(clone);
			return fullRest.length;
		}

		let lo = 0;
		let hi = fullRest.length;
		while (lo < hi) {
			const mid = Math.floor((lo + hi + 1) / 2);
			const suffix = mid < fullRest.length ? '…' : '';
			textSpan.textContent = fullRest.slice(0, mid) + suffix;
			if (fits(clone)) lo = mid;
			else hi = mid - 1;
		}
		document.body.removeChild(clone);
		return lo;
	}

	$effect(() => {
		const rest = leadParaRest;
		const mdUp =
			typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
		const clamp =
			mdUp &&
			((!!leadFeaturedMedia && leadImageColHeight > 0) || !leadFeaturedMedia);

		if (typeof document === 'undefined') {
			leadBodyRestDisplay = rest;
			return;
		}

		if (!clamp) {
			leadBodyRestDisplay = rest;
			return;
		}

		let cancelled = false;

		function applyClamp() {
			if (cancelled) return;
			const el = leadTextEl;
			if (!el) return;
			tick().then(() => {
				if (cancelled) return;
				const len = maxRestLengthThatFits(el, rest);
				if (cancelled) return;
				leadBodyRestDisplay = rest.slice(0, len) + (len < rest.length ? '…' : '');
			});
		}

		applyClamp();

		const el = leadTextEl;
		const ro =
			el &&
			new ResizeObserver(() => {
				requestAnimationFrame(applyClamp);
			});
		if (el && ro) ro.observe(el);

		const mq = window.matchMedia('(min-width: 768px)');
		const onMq = () => applyClamp();
		mq.addEventListener('change', onMq);

		return () => {
			cancelled = true;
			ro?.disconnect();
			mq.removeEventListener('change', onMq);
		};
	});
</script>

{#if articles && articles.length > 0}
	<div class="newspaper-articles">
	{#if leadArticle?.slug}
		<section class="headline-section">
			<a href={`/articles/${leadArticle.slug}`} class="main-headline-link">
				<h2
					class="main-headline-title"
					style:view-transition-name={leadArticle.slug
						? `article-headline-${leadArticle.slug}`
						: undefined}
				>
					{leadArticle.title}
				</h2>
				<div
					class="main-headline-grid"
					class:main-headline-grid--no-image={!leadFeaturedMedia}
				>
					{#if leadFeaturedMedia}
						<div class="main-headline-image-wrap" bind:clientHeight={leadImageColHeight}>
							<div class="main-headline-image">
								{#key `${leadArticle.slug}-${leadFeaturedMedia.id}`}
									<Image
										image={leadFeaturedMedia}
										priority
										objectFit="cover"
										sizes="(min-width: 768px) 35vw, 100vw"
										transitionName={leadArticle.slug
											? `article-featured-image-${leadArticle.slug}`
											: undefined}
									/>
								{/key}
							</div>
							<p class="image-caption">Photo from the archives</p>
						</div>
					{/if}
					<div
						class="main-headline-text-column"
						class:main-headline-text-column--align-to-image={!!leadFeaturedMedia && leadImageColHeight > 0}
						class:main-headline-text-column--no-image={!leadFeaturedMedia}
						style:--lead-image-col-height={leadFeaturedMedia && leadImageColHeight > 0
							? `${leadImageColHeight}px`
							: undefined}
					>
						<div
							class="main-headline-lead-column-flow"
							class:main-headline-lead-column-flow--three={!leadFeaturedMedia}
							bind:this={leadTextEl}
						>
							<div
								class="main-headline-dateline"
								class:main-headline-dateline--empty={!leadPubLabel && !leadCreatedLabel && !leadCategoryTitle}
								style:view-transition-name={leadArticle.slug
									? `article-dateline-${leadArticle.slug}`
									: undefined}
							>
								{#if leadPubLabel || leadCreatedLabel || leadCategoryTitle}
									<div
										class="main-headline-meta"
										style:view-transition-name={`article-meta-${leadArticle.slug}`}
									>
										{#if leadPubLabel}
											<span style:view-transition-name={`article-pub-date-${leadArticle.slug}`}>
												Published on {leadPubLabel}
											</span>
										{/if}
										{#if leadPubLabel && leadCreatedLabel}
											<span class="main-headline-meta-sep" aria-hidden="true">|</span>
										{/if}
										{#if leadCreatedLabel}
											<span>First written {leadCreatedLabel}</span>
										{/if}
										{#if leadCategoryTitle}
											{#if leadPubLabel || leadCreatedLabel}
												<span class="main-headline-meta-sep" aria-hidden="true">|</span>
											{/if}
											<span style:view-transition-name={`article-category-${leadArticle.slug}`}>
												Filed under {leadCategoryTitle}
											</span>
										{/if}
									</div>
								{/if}
							</div>
							{#if leadBlocks.length > 0}
								<div
									class="main-headline-lead-body"
									style:view-transition-name={leadArticle.slug
										? `article-content-${leadArticle.slug}`
										: undefined}
								>
									{#each leadBlocks as block, i (i)}
										{#if i < leadParagraphMap.fullCount}
											{#if i === 0}
												<span class="drop-cap">{block.plain.charAt(0)}</span>
												<NodeRenderer
													node={processLexicalNode(
														stripFirstCharacterFromParagraphNode(block.node)
													) as never}
												/>
											{:else}
												<NodeRenderer node={processLexicalNode(block.node) as never} />
											{/if}
										{:else if leadParagraphMap.partialIndex === i && leadParagraphMap.partialPlain != null}
											{#if i === 0}
												<span class="drop-cap">{block.plain.charAt(0)}</span>
												<NodeRenderer
													node={processLexicalNode(
														paragraphNodeToPlainTextOnly(
															block.node,
															leadParagraphMap.partialPlain,
															leadTruncatedWithEllipsis
														)
													) as never}
												/>
											{:else}
												<NodeRenderer
													node={processLexicalNode(
														paragraphNodeToPlainTextOnly(
															block.node,
															leadParagraphMap.partialPlain,
															leadTruncatedWithEllipsis
														)
													) as never}
												/>
											{/if}
										{/if}
									{/each}
									<span class="main-headline-lead-clamp-mirror" aria-hidden="true"
										>{leadBodyRestDisplay || leadParaRest}</span>
								</div>
							{/if}
							<div class="main-headline-lead-footer">
								<span class="read-more">Continued inside…</span>
								{#if leadArticle.tags?.length}
									<div
										class="tags-inline"
										style:view-transition-name={leadArticle.slug
											? `article-tags-${leadArticle.slug}`
											: undefined}
									>
										{#each leadArticle.tags as tag, i (tagKey(tag, i))}
											<span class="article-tag">{tagLabel(tag)}</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</a>
		</section>
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
		--newspaper-lead-no-media-max-h: min(72vh, 34rem);
		--newspaper-tag-fs: calc(var(--fs-xs) * 0.85);
	}

	.headline-section {
		border-bottom: 1px solid #ccc;
		padding-bottom: 0.85rem;
		margin-bottom: 0.85rem;
	}

	.main-headline-link {
		text-decoration: none;
		display: block;
		color: inherit;

		&:hover .main-headline-title {
			color: #8b0000;
		}
	}

	.main-headline-title {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-m);
		font-weight: 700;
		color: #1a1a1a;
		text-align: center;
		line-height: var(--newspaper-title-lh);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: var(--newspaper-section-heading-ls);
		transition: color 0.2s;
	}

	.main-headline-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;

		@media (min-width: 768px) {
			grid-template-columns: 1fr 1.5fr;
			gap: 1.15rem;
			/* Avoid row height growing from the text column’s max-content when we cap it to image height */
			align-items: start;
		}
	}

	/*
	 * No featured image: must span full width. Use compound selector so this wins over
	 * `.main-headline-grid` @768 (same specificity otherwise the 1fr 1.5fr rule can win).
	 * grid-column is a fallback if anything still creates two tracks.
	 */
	.main-headline-grid.main-headline-grid--no-image {
		@media (min-width: 768px) {
			grid-template-columns: 1fr;
		}

		.main-headline-text-column {
			grid-column: 1 / -1;
			min-width: 0;
		}
	}

	.main-headline-image {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		border: 1px solid #ccc;
		overflow: hidden;
	}

	.main-headline-image :global(.image-container) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		aspect-ratio: unset !important;
	}

	.image-caption {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		font-style: italic;
		color: #666;
		text-align: center;
		margin-top: 0.3rem;
		line-height: var(--newspaper-body-lh);
	}

	.main-headline-text-column {
		min-width: 0;
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-base);
		line-height: var(--newspaper-body-lh);
		color: #333;
	}

	/* Meta → body → footer (tags); 2 cols with hero image, 3 cols when there is no image (desktop) */
	.main-headline-lead-column-flow {
		min-width: 0;
		position: relative;
		column-count: 1;
		column-gap: var(--newspaper-multicol-gap);
		text-align: justify;
	}

	@media (min-width: 768px) {
		.main-headline-lead-column-flow {
			column-count: 2;
			column-rule: 1px solid #ccc;
		}

		.main-headline-lead-column-flow.main-headline-lead-column-flow--three {
			column-count: 3;
		}
	}

	@media (min-width: 768px) {
		/* Image right column: height matches image; flow fills it */
		.main-headline-text-column.main-headline-text-column--align-to-image {
			height: var(--lead-image-col-height);
			max-height: var(--lead-image-col-height);
			overflow: hidden;
			min-height: 0;
			box-sizing: border-box;
		}

		.main-headline-text-column--align-to-image .main-headline-lead-column-flow {
			height: 100%;
			min-height: 0;
			overflow: hidden;
		}

		/* No image: full grid width; 3-col flow; cap height only (short articles stay short) */
		.main-headline-text-column.main-headline-text-column--no-image {
			display: flex;
			flex-direction: column;
			max-height: var(--newspaper-lead-no-media-max-h);
			min-height: 0;
			overflow: hidden;
		}

		.main-headline-text-column--no-image .main-headline-lead-column-flow {
			flex: 1 1 auto;
			min-height: 0;
			overflow: hidden;
		}
	}

	.main-headline-lead-body {
		display: flow-root;
	}

	/* Lexical <p>: strip Lexical default margins; indent following paragraphs */
	.main-headline-lead-column-flow :global(p) {
		margin: 0;
		padding: 0;
		line-height: inherit;
		text-align: justify;
	}

	.main-headline-lead-column-flow :global(p + p) {
		text-indent: 1.5em;
	}

	.main-headline-lead-clamp-mirror {
		position: absolute;
		left: -9999px;
		top: 0;
		width: 100%;
		visibility: hidden;
		pointer-events: none;
		white-space: pre-line;
		font: inherit;
		color: inherit;
		margin: 0;
		padding: 0;
		border: 0;
		column-count: inherit;
	}

	.main-headline-lead-footer {
		text-align: right;
		break-inside: avoid;
	}

	.main-headline-lead-footer .read-more {
		display: inline-block;
		margin-top: 0.35rem;
	}

	.main-headline-lead-column-flow .main-headline-dateline {
		/* Starts top of column 1 (meta → then body flows in columns) */
		margin-bottom: 0.55rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #ccc;
		break-inside: avoid;
	}

	.main-headline-dateline--empty {
		margin: 0;
		padding: 0;
		border: none;
	}

	.main-headline-meta {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		color: #555;
		text-transform: uppercase;
		letter-spacing: var(--newspaper-meta-ls);
		line-height: var(--newspaper-body-lh);
		text-align: start;
		margin: 0;
	}

	.main-headline-meta-sep {
		color: #aaa;
		font-weight: 400;
	}

	.drop-cap {
		float: left;
		font-size: var(--fs-l);
		line-height: 0.82;
		padding-right: 0.4rem;
		padding-top: 0.15rem;
		font-weight: 700;
		color: #1a1a1a;
	}

	.read-more {
		font-family: inherit;
		font-size: inherit;
		font-style: italic;
		line-height: var(--newspaper-body-lh);
		letter-spacing: inherit;
		color: #8b0000;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.tags-inline {
		display: flex;
		gap: 0.2rem;
		flex-wrap: wrap;
		margin-top: 0.35rem;
	}

	.main-headline-lead-footer .tags-inline {
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
