<script lang="ts">
	import { page } from '$app/state';
	import Newspaper from '$lib/components/Newspaper';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();

	const selectedCategory = $derived(page.url.searchParams.get('category') || '');
	const selectedTag = $derived(page.url.searchParams.get('tag') || '');

	const newspaper = $derived({
		title: 'From My Desk',
		subtitle: 'A collection of my thoughts and ideas',
		categories: data.categories,
		tags: data.tags,
		selectedCategory,
		selectedTag,
		articles: data.articles,
		pagination: data.pagination
	});
</script>

<div class="newspaper-page">
	<Newspaper {...newspaper} />
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
