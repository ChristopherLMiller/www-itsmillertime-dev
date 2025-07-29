<script lang="ts">
	import { page } from '$app/state';
	import Lexical from '$lib/Lexical.svelte';
	import Newspaper from '$lib/Newspaper.svelte';
	import { getArticle } from '$lib/queries/getArticle';
	import type { Post } from '$lib/types/payload-types';
	import { createQuery } from '@tanstack/svelte-query';
	const articleQuery = createQuery<{ post: Post; meta: unknown }>({
		queryKey: ['article', page.params.slug],
		queryFn: () => getArticle(fetch, page.params.slug),
		staleTime: 1000 * 60 * 60
	});
</script>

<Newspaper
	heading="From My Desk"
	subheading={$articleQuery.data?.title}
	headingTransitionName={`article-headline-${$articleQuery.data?.slug}`}
	columns={2}
	featuredImage={$articleQuery.data?.featuredImage}
	featuredImageTransitionName={`article-featured-image-${$articleQuery.data?.slug}`}
>
	{#snippet meta()}
		<div class="meta">
			<span style:view-transition-name={`article-pub-date-${$articleQuery.data?.slug}`}>
				Published on {new Date($articleQuery.data?.originalPublicationDate).toLocaleDateString(
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
				>First written {new Date($articleQuery.data?.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</span>
			|
			<span style:view-transition-name={`article-category-${$articleQuery.data?.slug}`}>
				Filed under {$articleQuery.data?.category?.title}
			</span>
		</div>
	{/snippet}
	<article
		class="post contents"
		style:view-transition-name={`article-content-${$articleQuery.data?.slug}`}
	>
		<Lexical data={$articleQuery.data?.content} />
	</article>
</Newspaper>

<style lang="postcss">
	.meta {
		font-size: var(--fs-xs);
		line-height: initial;
	}
</style>
