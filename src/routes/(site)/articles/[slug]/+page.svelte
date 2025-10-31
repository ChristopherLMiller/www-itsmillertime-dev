<script lang="ts">
	import { page } from '$app/state';
	import Lexical from '$lib/Lexical.svelte';
	import Newspaper from '$lib/Newspaper.svelte';

	const { data } = $props();
</script>

<Newspaper
	heading="From My Desk"
	subheading={data.article.title}
	headingTransitionName={`article-headline-${data.article.slug}`}
	columns={2}
	featuredImage={data.article.featuredImage}
	featuredImageTransitionName={`article-featured-image-${data.article.slug}`}
>
	{#snippet meta()}
		<div class="meta">
			<span style:view-transition-name={`article-pub-date-${data.article.slug}`}>
				Published on {new Date(data.article.originalPublicationDate).toLocaleDateString(
					'en-US',
					{
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					}
				)}
			</span>
			|
			<span
				>First written {new Date(data.article.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</span>
			|
			<span style:view-transition-name={`article-category-${data.article.slug}`}>
				Filed under {data.article.category?.title}
			</span>
		</div>
	{/snippet}
	<article
		class="post contents"
		style:view-transition-name={`article-content-${data.article.slug}`}
	>
		<Lexical data={data.article.content} />
	</article>
</Newspaper>

<style lang="postcss">
	.meta {
		font-size: var(--fs-xs);
		line-height: initial;
	}
</style>
