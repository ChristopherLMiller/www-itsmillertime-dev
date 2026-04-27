<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import NodeRenderer from '$lib/NodeRenderer.svelte';
	import type { Media, Post, PostsTag } from '$lib/types/payload-types';
	import {
		paragraphNodeToPlainTextOnly,
		processLexicalNode,
		stripFirstCharacterFromParagraphNode
	} from '../../../../utilities/lexicalProcessNode';
	import { getLexicalParagraphsUpToWords } from '../../../../utilities/lexicalParagraphsUpToWords';
	import { NEWSPAPER_LEAD_MAX_WORDS } from '../newspaperLeadConstants';

	interface Props {
		article: Post;
		image: Media;
	}

	let { article, image }: Props = $props();

	const dateOpts: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};

	const leadPubLabel = $derived(
		article.originalPublicationDate || article.createdAt
			? new Date(article.originalPublicationDate ?? article.createdAt!).toLocaleDateString(
					'en-US',
					dateOpts
				)
			: ''
	);

	const leadCreatedLabel = $derived(
		article.createdAt ? new Date(article.createdAt).toLocaleDateString('en-US', dateOpts) : ''
	);

	const leadCategoryTitle = $derived(
		typeof article.category === 'object' && article.category?.title ? article.category.title : null
	);

	const leadResult = $derived(
		getLexicalParagraphsUpToWords(article.content, NEWSPAPER_LEAD_MAX_WORDS, {
			maxChars: 16000,
			maxParagraphs: 50
		})
	);
	const leadBlocks = $derived(leadResult.blocks);
	const leadHasMore = $derived(leadResult.hasMore);

	const lastLeadBlock = $derived(leadBlocks.length ? leadBlocks[leadBlocks.length - 1] : null);
	/** When the last visible block is a full paragraph but more of the document exists, append “Continued on” via ::after. */
	const showContinuedAfterFullLastParagraph = $derived(
		Boolean(leadHasMore && lastLeadBlock && !lastLeadBlock.isWordTruncated)
	);

	function tagLabel(tag: number | PostsTag): string {
		if (typeof tag === 'object' && tag?.title) return tag.title;
		return String(tag);
	}

	function tagKey(tag: number | PostsTag, i: number): string | number {
		if (typeof tag === 'object' && tag?.id != null) return tag.id;
		return `${tag}-${i}`;
	}
</script>

{#if article.slug}
	<section class="headline-section">
		<a href={`/articles/${article.slug}`} class="main-headline-link">
			<h2
				class="main-headline-title"
				style:view-transition-name={article.slug ? `article-headline-${article.slug}` : undefined}
			>
				{article.title}
			</h2>
			<div class="main-headline-grid">
				<div class="main-headline-image-wrap">
					<div class="main-headline-image">
						{#key `${article.slug}-${image.id}`}
							<Image
								{image}
								priority
								objectFit="contain"
								sizes="(min-width: 768px) min(32rem, 45vw), 100vw"
								transitionName={article.slug ? `article-featured-image-${article.slug}` : undefined}
							/>
						{/key}
					</div>
					<p class="image-caption">Photo from the archives</p>
				</div>
				<div class="main-headline-text-column">
					<div class="main-headline-body-column-flow">
						<div
							class="main-headline-dateline"
							class:main-headline-dateline--empty={!leadPubLabel &&
								!leadCreatedLabel &&
								!leadCategoryTitle}
							style:view-transition-name={article.slug
								? `article-dateline-${article.slug}`
								: undefined}
						>
							{#if leadPubLabel || leadCreatedLabel || leadCategoryTitle}
								<div
									class="main-headline-meta"
									style:view-transition-name={`article-meta-${article.slug}`}
								>
									{#if leadPubLabel}
										<span style:view-transition-name={`article-pub-date-${article.slug}`}>
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
										<span style:view-transition-name={`article-category-${article.slug}`}>
											Filed under {leadCategoryTitle}
										</span>
									{/if}
								</div>
							{/if}
						</div>
						{#if article.tags?.length}
							<div
								class="main-headline-tags-below-meta"
								style:view-transition-name={article.slug
									? `article-tags-${article.slug}`
									: undefined}
							>
								<div class="tags-inline">
									{#each article.tags as tag, i (tagKey(tag, i))}
										<span class="article-tag">{tagLabel(tag)}</span>
									{/each}
								</div>
							</div>
						{/if}
						{#if leadBlocks.length > 0}
							<div
								class="main-headline-lead-body"
								class:main-headline-lead-body--continued-on-after-full={showContinuedAfterFullLastParagraph}
								style:view-transition-name={article.slug
									? `article-content-${article.slug}`
									: undefined}
							>
								{#each leadBlocks as block, i (i)}
									{#if block.isWordTruncated}
										<div class="main-headline-continued-line">
											{#if i === 0}
												<span class="drop-cap">{block.plain.charAt(0)}</span>
												<NodeRenderer
													node={processLexicalNode(
														paragraphNodeToPlainTextOnly(
															block.node,
															block.plain.length > 1 ? block.plain.slice(1) : '',
															false
														)
													) as never}
												/>
											{:else}
												<NodeRenderer
													node={processLexicalNode(
														paragraphNodeToPlainTextOnly(block.node, block.plain, false)
													) as never}
												/>
											{/if}
										</div>
									{:else if i === 0}
										<span class="drop-cap">{block.plain.charAt(0)}</span>
										<NodeRenderer
											node={processLexicalNode(
												stripFirstCharacterFromParagraphNode(block.node)
											) as never}
										/>
									{:else}
										<NodeRenderer node={processLexicalNode(block.node) as never} />
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</a>
	</section>
{/if}

<style lang="postcss">
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
			/* First track sizes to the hero (natural aspect, capped); second track gets the text. */
			grid-template-columns: minmax(0, min(32rem, 48vw, 100%)) minmax(0, 1fr);
			gap: 1.15rem;
			align-items: start;
		}
	}

	.main-headline-image {
		position: relative;
		width: 100%;
		border: 1px solid #ccc;
		overflow: hidden;
		/* aspect ratio and sizing come from Image (media / thumbnail metadata). */
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

	.main-headline-body-column-flow {
		min-width: 0;
		position: relative;
		column-count: 1;
		column-gap: var(--newspaper-multicol-gap);
		text-align: justify;
	}

	@media (min-width: 768px) {
		.main-headline-body-column-flow {
			column-count: 2;
			column-rule: 1px solid #ccc;
		}
	}

	.main-headline-lead-body {
		display: flow-root;
	}

	.main-headline-continued-line {
		display: flow-root;
	}

	/* “Continued on…” (card is the <a>; burgundy + italic; click hits parent link) */
	.main-headline-continued-line :global(p::after),
	.main-headline-lead-body--continued-on-after-full :global(p:last-of-type::after) {
		content: ' Continued on…';
		font-style: italic;
		font-weight: 500;
		font-family: inherit;
		font-size: inherit;
		line-height: var(--newspaper-body-lh);
		letter-spacing: inherit;
		color: #8b0000;
	}

	.main-headline-link:hover .main-headline-continued-line :global(p::after),
	.main-headline-link:hover
		.main-headline-lead-body--continued-on-after-full
		:global(p:last-of-type::after) {
		color: #5c0000;
	}

	.main-headline-body-column-flow :global(p) {
		margin: 0;
		padding: 0;
		line-height: inherit;
		text-align: justify;
	}

	.main-headline-body-column-flow :global(p + p) {
		text-indent: 1.5em;
	}

	/* Dateline + tags share the first multicol column width (not full text block). */
	.main-headline-body-column-flow .main-headline-tags-below-meta {
		margin: 0 0 0.5rem 0;
		text-align: start;
	}

	.main-headline-body-column-flow .main-headline-tags-below-meta .tags-inline {
		margin-top: 0.25rem;
	}

	.main-headline-body-column-flow .main-headline-dateline {
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
</style>
