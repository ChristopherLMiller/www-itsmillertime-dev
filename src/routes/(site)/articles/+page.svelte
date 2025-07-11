<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import Excerpt from '$lib/Excerpt.svelte';
	import Newspaper from '$lib/Newspaper.svelte';
	import Paginator from '$lib/Paginator.svelte';
	import type { Post } from '$lib/types/payload-types';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();

	let posts = $derived(data.posts as Post[]);
</script>

<Newspaper heading="From My Desk">
	<div class="contents">
		{#each posts as post (post.id)}
			<Excerpt item={post} />
		{/each}
	</div>
	{#snippet footerContent()}
		<span
			>Page {page.url.searchParams.get('page') || '1'} of {data.meta.totalPages} ({data.meta
				.totalDocs} total)</span
		>
	{/snippet}
</Newspaper>
<Paginator meta={data.meta} />
