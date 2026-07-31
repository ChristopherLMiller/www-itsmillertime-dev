<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { createQuery } from '@tanstack/svelte-query';
	import Disqus from '$lib/components/Disqus';
	import { NewspaperArticleContent, NewspaperLayout } from '$lib/components/Newspaper';
	import ShareButtons from '$lib/components/ShareButtons';
	import { articleQueryOptions } from '$lib/query/queries';
	import { pageMetaOverride } from '$lib/stores/pageMeta';
	import { precacheArticleContext } from '$lib/pwa/articleOfflineSync';
	import type { PostsCategory, PostsTag } from '$lib/types/payload-types';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	const includeDrafts = $derived(
		data.includeDrafts ||
			(!!page.data.session?.user &&
				(page.data.session?.user?.role as string[] | undefined)?.includes('admin'))
	);

	const query = createQuery(() =>
		articleQueryOptions(
			data.slug,
			includeDrafts,
			includeDrafts === data.includeDrafts ? data.initialArticle : null
		)
	);

	const articleData = $derived(query.data ?? data.initialArticle);
	const article = $derived(articleData?.article);
	const relatedModels = $derived(articleData?.relatedModels ?? []);

	const categories: PostsCategory[] = [];
	const tags: PostsTag[] = [];

	// Publish the article's SEO meta so the shared <Meta> component uses it.
	$effect(() => {
		pageMetaOverride.set(articleData?.meta ?? null);
		return () => pageMetaOverride.set(null);
	});

	$effect(() => {
		if (!browser || !article) return;
		precacheArticleContext(article.slug);
	});
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
		{#if article}
			<NewspaperArticleContent {article} {relatedModels}>
				{#snippet share()}
					<ShareButtons url={page.url.href} title={article.title} />
				{/snippet}
				{#snippet footer()}
					<Disqus
						identifier={`article-${article.slug}`}
						title={article.title}
						url={page.url.href}
					/>
				{/snippet}
			</NewspaperArticleContent>
		{:else if query.isError}
			<p class="state-message">
				This article is not available offline yet. Open it once while online to cache it.
			</p>
		{/if}
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

	.state-message {
		text-align: center;
		padding: 3rem 1rem;
		font-family: var(--font-special-elite);
	}
</style>
