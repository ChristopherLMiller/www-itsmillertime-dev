<script lang="ts">
	import Lexical from '$lib/Lexical.svelte';
	import Newspaper from '$lib/Newspaper.svelte';

	const { data } = $props();
	const post = data.post;
</script>

<Newspaper
	heading="From My Desk"
	subheading={post.title}
	headingTransitionName={`article-headline-${post.slug}`}
	columns={2}
	featuredImage={post.featuredImage}
	featuredImageTransitionName={`article-featured-image-${post.slug}`}
>
	{#snippet meta()}
		<div class="meta">
			<span style:view-transition-name={`article-pub-date-${post.slug}`}>
				Published on {new Date(post.originalPublicationDate).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</span>
			|
			<span
				>First written {new Date(post.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</span>
			|
			<span style:view-transition-name={`article-category-${post.slug}`}>
				Filed under {post?.category?.title}
			</span>
		</div>
	{/snippet}
	<article class="post contents" style:view-transition-name={`article-content-${post.slug}`}>
		<Lexical data={post.content} />
	</article>
</Newspaper>

<style lang="postcss">
	.meta {
		font-size: var(--fs-xs);
		line-height: initial;
	}
</style>
