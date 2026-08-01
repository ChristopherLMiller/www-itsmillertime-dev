<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Newspaper from '$lib/components/Newspaper';
	import { precacheArticlesListing } from '$lib/pwa/articleOfflineSync';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	/**
	 * Listing is SSR-only. TanStack + IndexedDB + SW used to race and overwrite
	 * fresh server data with a stale/partial list (especially after a Node restart
	 * when the SW briefly fell back to a cached `/articles` document).
	 */
	const list = $derived(data.initialArticles);
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
