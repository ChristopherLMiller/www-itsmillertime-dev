<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import Excerpt from '$lib/Excerpt.svelte';
	import Newspaper from '$lib/Newspaper.svelte';
	import Paginator from '$lib/Paginator.svelte';
	import { getArticles } from '$lib/queries/getArticles';
	import { createQuery } from '@tanstack/svelte-query';

	const searchParams = $derived(page.url.searchParams);
	const queryParams = $derived({
		page: searchParams.get('page') || 1,
		limit: searchParams.get('limit') || 15,
		category: searchParams.get('category') || null,
		sort: searchParams.get('sort') || '-publishedAt'
	});

	const articlesQuery = $derived(
		createQuery({
			queryKey: ['articles', queryParams],
			queryFn: () => getArticles(fetch, queryParams),
			staleTime: 1000 * 60 * 60
		})
	);
</script>

{#if $articlesQuery.isSuccess && $articlesQuery.data?.articles}
	<Newspaper heading="From My Desk">
		<div class="contents">
			{#each $articlesQuery.data.articles as post (post.id)}
				<Excerpt item={post} />
			{/each}
		</div>
		{#snippet footerContent()}
			<span
				>Page {page.url.searchParams.get('page') || '1'} of {$articlesQuery.data?.meta.totalPages} ({$articlesQuery
					.data?.meta.totalDocs} total)</span
			>
		{/snippet}
	</Newspaper>
	<Paginator meta={$articlesQuery.data?.meta} />
{/if}
