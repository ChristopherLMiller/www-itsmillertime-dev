<script lang="ts">
	import { browser } from '$app/environment';
	import { goto, invalidateAll, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import FilmStrip from '$lib/components/FilmStrip.svelte';
	import Paginator from '$lib/Paginator.svelte';
	import GalleryLandingPolaroidStack from '$lib/components/GalleryLandingPolaroidStack.svelte';
	import { cssAspectRatioFromDimensions } from '$lib/utils/aspect-ratio';
	import type { Media } from '$lib/types/payload-types';
	import { SvelteMap } from 'svelte/reactivity';

	const { data } = $props();

	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const filteredGalleries = $derived(
		nsfwPref === 'hide' ? data.galleries.filter((g) => !g.settings?.isNsfw) : data.galleries
	);

	const perPageOptions = [6, 12, 15, 24, 48];

	const selectedCategory = $derived(page.url.searchParams.get('category') || '');
	const selectedTag = $derived(page.url.searchParams.get('tag') || '');
	let selectedPerPage = $state(Number(page.url.searchParams.get('limit')) || 15);
	let expandedAlbumImages = $state<Record<number, { images: Media[]; nsfwIds: Set<number> }>>({});
	const inFlightFetches = new SvelteMap<number, Promise<void>>();
	const preloadControllers = new SvelteMap<number, AbortController>();

	function cancelPendingPreloads() {
		for (const controller of preloadControllers.values()) controller.abort();
		preloadControllers.clear();
	}

	async function fetchAlbumImagesOnHover(albumId: number, signal?: AbortSignal) {
		if (expandedAlbumImages[albumId]) return;
		const existing = inFlightFetches.get(albumId);
		if (existing) {
			await existing;
			return;
		}
		if (signal?.aborted) return;
		const promise = (async () => {
			try {
				const res = await fetch(`/api/gallery/albums/${albumId}`, signal ? { signal } : undefined);
				if (!res.ok) return;
				const { docs } = await res.json();
				const rawDocs = docs ?? [];
				const nsfwIds = new Set<number>(
					rawDocs
						.filter((doc: unknown) => isImageNsfw(doc))
						.map((doc: unknown) => (doc as { id: number }).id)
				);
				const filtered = (
					nsfwPref === 'hide' ? rawDocs.filter((doc: unknown) => !isImageNsfw(doc)) : rawDocs
				)
					.map((doc: unknown) => asMedia(doc))
					.filter((img: Media | null): img is Media => img !== null);
				if (!signal?.aborted) {
					expandedAlbumImages = {
						...expandedAlbumImages,
						[albumId]: { images: filtered, nsfwIds }
					};
				}
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
			} finally {
				inFlightFetches.delete(albumId);
			}
		})();
		inFlightFetches.set(albumId, promise);
		await promise;
	}

	function coverGalleryImageId(gallery: (typeof filteredGalleries)[number]): number | null {
		const img = gallery.meta?.image;
		if (typeof img === 'number' && Number.isFinite(img)) return img;
		if (
			typeof img === 'object' &&
			img !== null &&
			'id' in img &&
			typeof (img as { id: unknown }).id === 'number'
		) {
			return (img as { id: number }).id;
		}
		return null;
	}

	function coverAspectRatio(gallery: (typeof filteredGalleries)[number]): number {
		const img = gallery.meta?.image;
		const w =
			typeof img === 'object' && img !== null && 'width' in img
				? (img as { width?: number | null }).width
				: null;
		const h =
			typeof img === 'object' && img !== null && 'height' in img
				? (img as { height?: number | null }).height
				: null;
		return cssAspectRatioFromDimensions(w ?? undefined, h ?? undefined, 4 / 3);
	}

	function coverBlurhash(gallery: (typeof filteredGalleries)[number]): string | null {
		const img = gallery.meta?.image;
		if (typeof img !== 'object' || img === null || !('blurhash' in img)) return null;
		const b = (img as { blurhash?: string | null }).blurhash;
		return typeof b === 'string' && b.length > 0 ? b : null;
	}

	function coverDimensions(gallery: (typeof filteredGalleries)[number]): {
		width: number | null;
		height: number | null;
	} {
		const img = gallery.meta?.image;
		if (typeof img !== 'object' || img === null) return { width: null, height: null };
		const o = img as { width?: number | null; height?: number | null };
		return { width: o.width ?? null, height: o.height ?? null };
	}

	async function preloadAlbumImagesInBackground() {
		const ids = filteredGalleries
			.filter((gallery) => coverGalleryImageId(gallery) != null)
			.map((gallery) => gallery.id)
			.filter((id) => !expandedAlbumImages[id]);

		if (ids.length === 0) return;

		const concurrency = 2;
		let cursor = 0;

		const worker = async () => {
			while (cursor < ids.length) {
				const albumId = ids[cursor++];
				if (expandedAlbumImages[albumId] || inFlightFetches.has(albumId)) continue;

				const controller = new AbortController();
				preloadControllers.set(albumId, controller);
				try {
					await fetchAlbumImagesOnHover(albumId, controller.signal);
				} catch {
					// Ignore preload failures; hover can still fetch interactively.
				} finally {
					preloadControllers.delete(albumId);
				}
			}
		};

		await Promise.all(Array.from({ length: concurrency }, worker));
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

	function getTagHref(slug: string): string {
		const url = new URL(page.url);
		if (slug) {
			url.searchParams.set('tag', slug);
		} else {
			url.searchParams.delete('tag');
		}
		url.searchParams.set('page', '1');
		return url.pathname + url.search;
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

	$effect(() => {
		if (!browser || filteredGalleries.length === 0) return;

		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let cancelled = false;

		const startPreload = () => {
			if (cancelled) return;
			void preloadAlbumImagesInBackground();
		};

		// Kick off as soon as the DOM is ready to avoid hover-delay pop.
		if (document.readyState !== 'loading') {
			timeoutId = setTimeout(startPreload, 0);
		} else {
			document.addEventListener('DOMContentLoaded', startPreload, { once: true });
		}

		return () => {
			cancelled = true;
			if (timeoutId !== null) clearTimeout(timeoutId);
			document.removeEventListener('DOMContentLoaded', startPreload);
			cancelPendingPreloads();
		};
	});

	if (browser) {
		beforeNavigate(() => {
			cancelPendingPreloads();
		});
	}
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

{#if data.tags.length > 0}
	<div class="tag-strip-wrapper">
		<nav class="tag-contact-sheet" aria-label="Filter galleries by tag">
			<a href={getTagHref('')} class="tag-frame" class:tag-frame--active={!selectedTag}>
				<span class="tag-frame__label">All tags</span>
			</a>
			{#each data.tags as tag (tag.id)}
				<a
					href={getTagHref(tag.slug ?? '')}
					class="tag-frame"
					class:tag-frame--active={selectedTag === (tag.slug ?? '')}
				>
					<span class="tag-frame__label">{tag.title}</span>
				</a>
			{/each}
		</nav>
	</div>
{/if}

<div class="galleries-grid">
	{#each filteredGalleries as gallery (gallery.id)}
		{@const gid = coverGalleryImageId(gallery)}
		{@const expanded = expandedAlbumImages[gallery.id]}
		{@const stackExtraImages = expanded?.images.filter((m) => m.id !== gid) ?? []}
		{@const nsfwIds = expanded ? expanded.nsfwIds : new Set<number>()}
		{@const needsProxy =
			gallery.settings?.isNsfw === true ||
			gallery.settings?.visibility !== 'ALL' ||
			nsfwIds.size > 0}
		{#if gid != null}
			{@const landingTilt = (
				(((gallery.id * 2654435761 + 1013904223) % 2147483647) / 2147483647) * 14 -
				7
			).toFixed(1)}
			{@const coverDim = coverDimensions(gallery)}
			<div class="gallery-link">
				<div class="gallery-link__tilt" style:transform="rotate({landingTilt}deg)">
					<GalleryLandingPolaroidStack
						galleryImageId={gid}
						primaryAspectRatio={coverAspectRatio(gallery)}
						coverWidth={coverDim.width}
						coverHeight={coverDim.height}
						initialBlurhash={coverBlurhash(gallery)}
						albumId={gallery.id}
						caption={gallery.title}
						albumDescription={gallery.meta?.description ?? undefined}
						useProxy={needsProxy}
						isNsfw={gallery.settings?.isNsfw === true}
						nsfwImageIds={nsfwIds}
						extraImages={stackExtraImages}
						enableViewTransition={true}
						hoverFlip={true}
						onHoverExpand={fetchAlbumImagesOnHover}
						onNavigate={() => goto(`/galleries/${gallery.slug}`)}
					/>
				</div>
			</div>
		{/if}
	{/each}
</div>

<div class="pagination-row">
	<Paginator meta={data.meta} />
	<div class="pagination-info">
		<div class="per-page">
			<label for="per-page-select">Show</label>
			<select
				id="per-page-select"
				class="per-page-select"
				bind:value={selectedPerPage}
				onchange={handlePerPageChange}
			>
				{#each perPageOptions as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>
		<span class="page-info">
			Page {page.url.searchParams.get('page') || '1'} of {data.meta.totalPages} ({data.meta
				.totalDocs} total)
		</span>
	</div>
</div>

<style lang="postcss">
	.film-strip-wrapper {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.5rem 1rem 0;
	}

	.tag-strip-wrapper {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.75rem 1rem 0;
	}

	.tag-contact-sheet {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
		align-items: center;
		padding: 0.75rem;
		background:
			repeating-linear-gradient(
				to right,
				rgba(255, 255, 255, 0.08) 0,
				rgba(255, 255, 255, 0.08) 1px,
				transparent 1px,
				transparent 18px
			),
			#f5f0e6;
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 0.4rem;
	}

	.tag-frame {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.7rem;
		background: var(--color-white-lightest);
		border: 1px solid var(--color-tertiary-light);
		border-radius: 999px;
		text-decoration: none;
		color: var(--color-primary);
		transition:
			transform 0.2s ease,
			border-color 0.2s ease,
			background-color 0.2s ease;

		&:hover {
			transform: translateY(-1px);
			border-color: var(--color-primary);
			background: #fffef9;
		}

		&:focus-visible {
			outline: 2px solid var(--color-primary);
			outline-offset: 2px;
		}
	}

	.tag-frame__label {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		letter-spacing: 0.03em;
		white-space: nowrap;
	}

	.tag-frame--active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-white-lightest);
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

	.gallery-link__tilt {
		width: 100%;
		transform-origin: center;
		transition: transform 250ms ease;
	}

	.gallery-link:hover .gallery-link__tilt,
	.gallery-link:focus-within .gallery-link__tilt {
		transform: rotate(0deg) scale(1.03);
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
