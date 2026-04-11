<script lang="ts">
	import { page } from '$app/state';
	import Disqus from '$lib/components/Disqus.svelte';
	import { NewspaperArticleContent, NewspaperLayout } from '$lib/components/Newspaper';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	import type { PostsCategory, PostsTag } from '$lib/types/payload-types';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	const categories: PostsCategory[] = [];
	const tags: PostsTag[] = [];
</script>

<div class="newspaper-page">
	<NewspaperLayout
		title="From My Desk"
		subtitle="A collection of my thoughts and ideas"
		subtitleTransitionName="newspaper-subtitle"
		mastheadTitleTag="p"
		{categories}
		selectedCategory=""
		{tags}
		selectedTag=""
		pagination={null}
		showFilters={false}
	>
		<NewspaperArticleContent article={data.article}>
			{#snippet footer()}
				<ShareButtons url={page.url.href} title={data.article.title} />
				<Disqus
					identifier={`article-${data.article.slug}`}
					title={data.article.title}
					url={page.url.href}
				/>
			{/snippet}
		</NewspaperArticleContent>
	</NewspaperLayout>
</div>

<style lang="postcss">
	.newspaper-page {
		min-height: 100vh;
		padding: 0.5rem 0 1rem;

		@media (min-width: 768px) {
			padding: 0.75rem 0 1.25rem;
		}
	}
</style>
