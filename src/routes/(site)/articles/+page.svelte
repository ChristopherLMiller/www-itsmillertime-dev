<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Excerpt from '$lib/Excerpt.svelte';
	import Newspaper from '$lib/Newspaper.svelte';
	import Paginator from '$lib/Paginator.svelte';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const perPageOptions = [5, 10, 15, 25, 50];

	let selectedCategory = $state(page.url.searchParams.get('category') || '');
	let selectedTag = $state('');
	let selectedPerPage = $state(Number(page.url.searchParams.get('limit')) || 10);

	async function handleCategoryChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const slug = target.value;
		const url = new URL(window.location.href);
		if (slug) {
			url.searchParams.set('category', slug);
		} else {
			url.searchParams.delete('category');
		}
		url.searchParams.set('page', '1'); // Reset to first page when changing category
		await goto(url.toString(), { keepFocus: true, noScroll: false });
	}

	async function handlePerPageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newLimit = target.value;
		const url = new URL(window.location.href);
		url.searchParams.set('limit', newLimit);
		url.searchParams.set('page', '1'); // Reset to first page when changing limit
		await goto(url.toString(), { keepFocus: true, noScroll: false });
	}
</script>

<Newspaper heading="From My Desk">
	{#snippet meta()}
		<div class="filters">
			<div class="filter-group">
				<label for="category-filter">Category</label>
				<select id="category-filter" class="filter-select" bind:value={selectedCategory} onchange={handleCategoryChange}>
					<option value="">All Categories</option>
					{#each data.categories as category (category.id)}
						<option value={category.slug}>{category.title}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="tag-filter">Tag</label>
				<select id="tag-filter" class="filter-select" bind:value={selectedTag}>
					<option value="">All Tags</option>
					{#each data.tags as tag (tag.id)}
						<option value={tag.slug}>{tag.title}</option>
					{/each}
				</select>
			</div>
		</div>
	{/snippet}
	<div class="contents">
		{#each data.articles as article (article.id)}
			<Excerpt item={article} />
		{/each}
	</div>
	{#snippet footerContent()}
		<div class="footer-row">
			<div class="per-page">
				<label for="per-page-select">Show</label>
				<select id="per-page-select" class="per-page-select" bind:value={selectedPerPage} onchange={handlePerPageChange}>
					{#each perPageOptions as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
			<span
				>Page {page.url.searchParams.get('page') || '1'} of {data?.meta.totalPages} ({data?.meta
					.totalDocs} total)</span
			>
		</div>
	{/snippet}
</Newspaper>

<Paginator meta={data.meta} />

<style lang="postcss">
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
		margin-block: 1rem;
		padding-block: 1rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.filter-group label {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 1px;
		font-weight: 600;
	}

	.filter-select {
		font-family: Garamond, serif;
		font-size: var(--fs-base);
		padding: 0.35rem 2rem 0.35rem 0.75rem;
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 0;
		background-color: var(--color-white-lightest);
		color: var(--color-primary);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		min-width: 160px;

		&:hover {
			border-color: var(--color-primary);
		}

		&:focus {
			outline: 2px solid var(--color-primary);
			outline-offset: 1px;
		}
	}

	.footer-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		width: 100%;
	}

	.per-page {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.per-page label {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.per-page-select {
		font-family: Garamond, serif;
		font-size: var(--fs-base);
		padding: 0.35rem 2rem 0.35rem 0.75rem;
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 0;
		background-color: var(--color-white-lightest);
		color: var(--color-primary);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;

		&:hover {
			border-color: var(--color-primary);
		}

		&:focus {
			outline: 2px solid var(--color-primary);
			outline-offset: 1px;
		}
	}
</style>
