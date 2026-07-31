<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { createQuery } from '@tanstack/svelte-query';
	import Newspaper from '$lib/components/Newspaper';
	import { articlesListQueryOptions } from '$lib/query/queries';
	import { precacheArticlesListing } from '$lib/pwa/articleOfflineSync';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

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

	const list = $derived(query.data ?? data.initialArticles);
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
	{:else if query.isError}
		<p class="state-message">
			These articles are not available offline yet. Open this page once while online to cache it.
		</p>
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
