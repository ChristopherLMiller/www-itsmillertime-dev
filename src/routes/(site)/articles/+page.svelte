<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import Excerpt from '$lib/Excerpt.svelte';
	import Newspaper from '$lib/Newspaper.svelte';
	import Paginator from '$lib/Paginator.svelte';
	import type { PageProps } from './$types';

const { data }: PageProps = $props();
console.log(data);
</script>

<Newspaper heading="From My Desk">
	<div class="contents">
		{#each data.articles as article (article.id)}
			<Excerpt item={article} />
		{/each}
	</div>
	{#snippet footerContent()}
	<span
		>Page {page.url.searchParams.get('page') || '1'} of {data?.meta.totalPages} ({data?.meta.totalDocs} total)</span
	>
{/snippet}
</Newspaper>
<Paginator meta={data.meta} />
