<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Newspaper from '$lib/components/Newspaper';
	import { articlesListQueriesMatch } from '$lib/cache/articleCache';
	import { precacheArticlesListing } from '$lib/pwa/articleOfflineSync';
	import { articlesListQueryOptions, queryKeys } from '$lib/query/queries';
	import { queryPersistRestored, seedServerQueryData } from '$lib/query/seedServerQuery';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const queryClient = useQueryClient();

	const includeDrafts = $derived(
		data.includeDrafts ||
			(!!page.data.session?.user &&
				(page.data.session?.user?.role as string[] | undefined)?.includes('admin'))
	);

	const query = createQuery(() =>
		articlesListQueryOptions(
			data.query,
			includeDrafts,
			includeDrafts === data.includeDrafts ? data.initialArticles : null
		)
	);

	$effect(() => {
		if (!browser) return;
		void $queryPersistRestored;
		if (includeDrafts !== data.includeDrafts) return;
		seedServerQueryData(
			queryClient,
			queryKeys.articlesList(data.query, includeDrafts),
			data.initialArticles
		);
	});

	const list = $derived.by(() => {
		const cached = query.data;
		if (query.isPlaceholderData) return data.initialArticles;
		if (cached && articlesListQueriesMatch(cached.query, data.query)) return cached;
		return data.initialArticles;
	});
	const articles = $derived(list?.articles ?? []);
	const categories = $derived(list?.categories ?? []);
	const tags = $derived(list?.tags ?? []);
	const pagination = $derived(list?.pagination ?? null);

	$effect(() => {
		if (!browser) return;
		precacheArticlesListing(articles.map((article) => article.slug));
	});

	const selectedCategory = $derived(page.url.searchParams.get('category') || '');
	const selectedTag = $derived(page.url.searchParams.get('tag') || '');

	const newspaper = $derived({
		title: 'From My Desk',
		subtitle: 'A collection of my thoughts and ideas',
		categories,
		tags,
		selectedCategory,
		selectedTag,
		articles,
		pagination
	});
</script>

<div class="newspaper-page">
	{#if list}
		<Newspaper {...newspaper} />
	{:else}
		<p class="state-message">No articles found.</p>
	{/if}
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
		color: var(--color-tertiary-darker);
		font-family: var(--font-oswald);
	}
</style>
