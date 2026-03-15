<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import FilmStrip from '$lib/components/FilmStrip.svelte';
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

	const selectedCategory = $derived(page.url.searchParams.get('category') || '');
	let selectedTag = $state(page.url.searchParams.get('tag') || '');
	let selectedPerPage = $state(Number(page.url.searchParams.get('limit')) || 15);
	let expandedAlbumImages = $state<
		Record<number, { images: Media[]; nsfwIds: Set<number> }>
	>({});
	const inFlightFetches = new Map<number, Promise<void>>();

	async function fetchAlbumImagesOnHover(albumId: number) {
		if (expandedAlbumImages[albumId]) return;
		const existing = inFlightFetches.get(albumId);
		if (existing) {
			await existing;
			return;
		}
		const promise = (async () => {
			try {
				const res = await fetch(`/api/gallery-album-images/${albumId}`);
				if (!res.ok) return;
				const { docs } = await res.json();
				const rawDocs = docs ?? [];
				const nsfwIds = new Set<number>(
					rawDocs
						.filter((doc: unknown) => isImageNsfw(doc))
						.map((doc: unknown) => (doc as { id: number }).id)
				);
				const filtered = (nsfwPref === 'hide'
					? rawDocs.filter((doc: unknown) => !isImageNsfw(doc))
					: rawDocs
				)
					.map((doc: unknown) => asMedia(doc))
					.filter((img: Media | null): img is Media => img !== null);
				expandedAlbumImages = { ...expandedAlbumImages, [albumId]: { images: filtered, nsfwIds } };
			} finally {
				inFlightFetches.delete(albumId);
			}
		})();
		inFlightFetches.set(albumId, promise);
		await promise;
	}

	async function handleCategoryChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		await selectCategory(target.value);
	}

	async function selectCategory(slug: string) {
		const url = new URL(window.location.href);
		if (slug) {
			url.searchParams.set('category', slug);
		} else {
			url.searchParams.delete('category');
		}
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true, noScroll: false });
	}

	function getCategoryHref(slug: string): string {
		const url = new URL(page.url);
		if (slug) {
			url.searchParams.set('category', slug);
		} else {
			url.searchParams.delete('category');
		}
		url.searchParams.set('page', '1');
		url.searchParams.delete('tag');
		return url.pathname + url.search;
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

	// Preload album images after page load so they're ready on hover (no delay)
	$effect(() => {
		if (!browser || filteredGalleries.length === 0) return;
		const galleriesToPreload = filteredGalleries;
		const schedulePreload = () => {
			const run = () => {
				for (const gallery of galleriesToPreload) {
					if (asMedia(gallery.meta?.image)) {
						fetchAlbumImagesOnHover(gallery.id);
					}
				}
			};
			if (typeof requestIdleCallback !== 'undefined') {
				requestIdleCallback(run, { timeout: 2000 });
			} else {
				setTimeout(run, 100);
			}
		};
		if (document.readyState === 'complete') {
			schedulePreload();
		} else {
			window.addEventListener('load', schedulePreload, { once: true });
		}
	});
</script>

{#if data.categories.length > 0}
	<div class="film-strip-wrapper">
		<FilmStrip
			categories={data.categories}
			selectedSlug={selectedCategory}
			getHref={getCategoryHref}
		/>
	</div>
{/if}

<header class="gallery-header">
	<h1 class="gallery-header__title">Galleries</h1>
	<div class="gallery-header__filters">
		<span class="gallery-header__filter-label">Filter by</span>
		<div class="filter-group">
			<label for="category-filter">Category</label>
			<select id="category-filter" class="filter-select" value={selectedCategory} onchange={handleCategoryChange}>
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
</header>

<div class="galleries-grid">
	{#each filteredGalleries as gallery (gallery.id)}
		{@const metaImage = asMedia(gallery.meta?.image)}
		{@const cover = metaImage}
		{@const initialDisplayImages = cover ? [cover] : []}
		{@const expanded = expandedAlbumImages[gallery.id]}
		{@const displayImages = expanded ? expanded.images : initialDisplayImages}
		{@const nsfwIds = expanded
			? expanded.nsfwIds
			: new Set<number>()}
		{@const needsProxy = gallery.settings?.isNsfw === true || gallery.settings?.visibility !== 'ALL' || nsfwIds.size > 0}
		{#if cover}
			<div class="gallery-link">
				<PolaroidStack
					primary={cover}
					images={displayImages}
					caption={gallery.title}
					enableViewTransition={true}
					hoverFlip={true}
					albumTitle={gallery.title}
					albumDescription={gallery.meta?.description ?? undefined}
					useProxy={needsProxy}
					isNsfw={gallery.settings?.isNsfw === true}
					nsfwImageIds={nsfwIds}
					albumId={gallery.id}
					onHoverExpand={fetchAlbumImagesOnHover}
					onNavigate={() => goto(`/galleries/${gallery.slug}`)}
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
	.film-strip-wrapper {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem 1rem 0;
	}

	.gallery-header {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem 1.5rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
	}

	.gallery-header__title {
		font-family: var(--font-permanent-marker), cursive;
		font-size: var(--fs-xl);
		font-weight: 400;
		color: var(--color-primary);
		text-align: center;
		margin: 0 0 1.25rem;
		letter-spacing: 0.02em;
	}

	.gallery-header__filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
		align-items: flex-end;
	}

	.gallery-header__filter-label {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 1px;
		font-weight: 600;
		padding-bottom: 0.25rem;
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