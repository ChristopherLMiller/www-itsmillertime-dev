<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Paginator from '$lib/Paginator.svelte';
	import PolaroidStack from '$lib/components/PolaroidStack.svelte';
	import type { Media } from '$lib/types/payload-types';

	const { data } = $props();

	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const filteredGalleries = $derived(
		nsfwPref === 'hide'
			? data.galleries.filter((g) => !g.settings?.isNsfw)
			: data.galleries
	);

	const perPageOptions = [6, 12, 15, 24, 48];

	let selectedCategory = $state(page.url.searchParams.get('category') || '');
	let selectedTag = $state(page.url.searchParams.get('tag') || '');
	let selectedPerPage = $state(Number(page.url.searchParams.get('limit')) || 15);

	async function handleCategoryChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const slug = target.value;
		const url = new URL(window.location.href);
		if (slug) {
			url.searchParams.set('category', slug);
		} else {
			url.searchParams.delete('category');
		}
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true, noScroll: false });
	}

	async function handleTagChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const slug = target.value;
		const url = new URL(window.location.href);
		if (slug) {
			url.searchParams.set('tag', slug);
		} else {
			url.searchParams.delete('tag');
		}
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true, noScroll: false });
	}

	async function handlePerPageChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const newLimit = target.value;
		const url = new URL(window.location.href);
		url.searchParams.set('limit', newLimit);
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true, noScroll: false });
	}

	function isImageNsfw(doc: unknown): boolean {
		if (typeof doc !== 'object' || doc === null) return false;
		const settings = (doc as { settings?: { isNsfw?: boolean } }).settings;
		return settings?.isNsfw === true;
	}

	function asMedia(value: unknown): Media | null {
		if (typeof value === 'object' && value !== null && 'id' in value && 'url' in value) {
			return value as Media;
		}
		return null;
	}

	// Refresh data when returning to the tab (e.g. after uploading elsewhere)
	$effect(() => {
		if (!browser) return;
		const handler = () => {
			if (document.visibilityState === 'visible') invalidateAll();
		};
		document.addEventListener('visibilitychange', handler);
		return () => document.removeEventListener('visibilitychange', handler);
	});
</script>

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
		<select id="tag-filter" class="filter-select" bind:value={selectedTag} onchange={handleTagChange}>
			<option value="">All Tags</option>
			{#each data.tags as tag (tag.id)}
				<option value={tag.slug}>{tag.title}</option>
			{/each}
		</select>
	</div>
</div>

<div class="galleries-grid">
	{#each filteredGalleries as gallery (gallery.id)}
		{@const docs = gallery.images?.docs ?? []}
		{@const stackImages = (nsfwPref === 'hide'
			? docs.filter((doc) => !isImageNsfw(doc))
			: docs
		).map((doc) => asMedia(doc)).filter((img): img is Media => img !== null)}
		{@const metaImage = asMedia(gallery.meta?.image)}
		{@const cover = metaImage ?? stackImages[0]}
		{@const displayImages = stackImages.length > 0 ? stackImages : cover ? [cover] : []}
		{@const nsfwIds = new Set(docs.filter((doc) => isImageNsfw(doc)).map((doc) => (doc as { id: number }).id))}
		{@const needsProxy = gallery.settings?.isNsfw === true || gallery.settings?.visibility !== 'ALL' || nsfwIds.size > 0}
		{#if cover}
			{@const categoryObj = typeof gallery.settings?.category === 'object' && gallery.settings?.category !== null ? gallery.settings.category : null}
			<div class="gallery-link">
				<PolaroidStack
					primary={cover}
					images={displayImages}
					caption={gallery.title}
					enableViewTransition={true}
					hoverFlip={true}
					albumTitle={gallery.title}
					albumDescription={gallery.meta?.description}
					useProxy={needsProxy}
					isNsfw={gallery.settings?.isNsfw === true}
					nsfwImageIds={nsfwIds}
					imageCount={stackImages.length}
					category={categoryObj}
					tags={gallery.settings?.tags ?? undefined}
					onNavigate={() => goto(`/galleries/${gallery.slug}`)}
					onCategoryClick={(slug) => {
						const url = new URL(page.url);
						url.searchParams.set('category', slug);
						url.searchParams.delete('tag');
						url.searchParams.set('page', '1');
						goto(url.toString(), { keepFocus: true });
					}}
					onTagClick={(slug) => {
						const url = new URL(page.url);
						url.searchParams.set('tag', slug);
						url.searchParams.delete('category');
						url.searchParams.set('page', '1');
						goto(url.toString(), { keepFocus: true });
					}}
				/>
			</div>
		{/if}
	{/each}
</div>

<div class="pagination-row">
	<Paginator meta={data.meta} />
	<div class="pagination-info">
		<div class="per-page">
			<label for="per-page-select">Show</label>
			<select id="per-page-select" class="per-page-select" bind:value={selectedPerPage} onchange={handlePerPageChange}>
				{#each perPageOptions as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
		<span class="page-info">
			Page {page.url.searchParams.get('page') || '1'} of {data.meta.totalPages} ({data.meta.totalDocs} total)
		</span>
	</div>
</div>

<style lang="postcss">
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
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

	.galleries-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	@media (min-width: 640px) {
		.galleries-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.galleries-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.galleries-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.gallery-link {
		display: block;
		text-decoration: none;
		color: inherit;
		width: 100%;
	}

	.gallery-link :global(.polaroid-stack) {
		width: 100%;
	}

	.gallery-link :global(.polaroid-stack__polaroid.polaroid) {
		width: 100%;
	}

	.pagination-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem;
	}

	.pagination-row :global(div:first-child) {
		flex: 1;
	}

	.pagination-info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
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

	.page-info {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
	}
</style>