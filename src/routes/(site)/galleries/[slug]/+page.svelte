<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Masonry from 'svelte-bricks';
	import Panel from '$lib/Panel.svelte';
	import GalleryAlbumHeader from '$lib/components/GalleryAlbumHeader.svelte';
	import GalleryAlbumPolaroid from '$lib/components/GalleryAlbumPolaroid.svelte';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import GalleryLightboxContent from '$lib/components/GalleryLightboxContent.svelte';
	import type { GalleryGridMedia } from '$lib/utils/gallery-image-display';
	import type { GalleryAlbum } from '$lib/types/payload-types';

	const IMAGE_BATCH_SIZE = 30;
	const LOAD_AHEAD_PX = 2400;

	const { data } = $props();

	const isRestricted = $derived(
		data.gallery.settings?.isNsfw === true ||
		data.gallery.settings?.visibility !== 'ALL'
	);
	const useProxy = $derived(isRestricted);
	const albumIsNsfw = $derived(data.gallery.settings?.isNsfw === true);
	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const shouldHideAlbum = $derived(albumIsNsfw && nsfwPref === 'hide');

	type ImageSlot = { id: number; isNsfw: boolean };

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	/** File media id for the open lightbox; keeps index stable as async previews resolve */
	let pinnedLightboxFileMediaId = $state<number | null>(null);
	let galleryImageSlots = $state<ImageSlot[]>([]);
	/** Resolved file media keyed by gallery-image row id */
	let slotMedia = $state<Record<number, GalleryGridMedia>>({});
	/** Per-slot preview fetch finished (success or error), for deep-link pagination */
	let slotFetchDone = $state<Record<number, boolean>>({});
	let loadedPage = $state<number>(1);
	let hasNextPage = $state<boolean>(false);
	let isLoadingMore = $state(false);
	let infiniteLoadError = $state<string | null>(null);
	let loadMoreSentinel = $state<HTMLDivElement | null>(null);

	const visibleSlots = $derived(
		galleryImageSlots.filter((s) => !(nsfwPref === 'hide' && s.isNsfw))
	);

	const galleryImages = $derived(
		visibleSlots.map((s) => slotMedia[s.id]).filter((m): m is GalleryGridMedia => m != null)
	);
	const totalImageCount = $derived(
		typeof data.gallery.images?.totalDocs === 'number'
			? data.gallery.images.totalDocs
			: galleryImages.length
	);

	function openLightboxForItem(item: GalleryGridMedia) {
		const idx = galleryImages.findIndex((m) => m.id === item.id);
		if (idx === -1) return;
		pinnedLightboxFileMediaId = item.id;
		lightboxIndex = idx;
		lightboxOpen = true;
		const url = new URL(window.location.href);
		url.searchParams.set('selected', String(item.id));
		replaceState(url, page.state);
	}

	function closeLightbox() {
		pinnedLightboxFileMediaId = null;
		const url = new URL(window.location.href);
		url.searchParams.delete('selected');
		replaceState(url, page.state);
	}

	function updateUrlForIndex(index: number) {
		const media = galleryImages[index];
		if (media?.id != null && typeof window !== 'undefined') {
			pinnedLightboxFileMediaId = media.id;
			const url = new URL(window.location.href);
			url.searchParams.set('selected', String(media.id));
			replaceState(url, page.state);
		}
	}

	async function loadNextImagePage() {
		if (!browser || isLoadingMore || !hasNextPage) return;
		isLoadingMore = true;
		infiniteLoadError = null;

		try {
			const nextPage = loadedPage + 1;
			const res = await fetch(
				`/api/gallery-album-images/${data.gallery.id}/paged?page=${nextPage}&limit=${IMAGE_BATCH_SIZE}&idsOnly=1`
			);
			if (!res.ok) throw new Error(`Failed to load page ${nextPage}`);

			const payload = await res.json();
			const nextDocs = Array.isArray(payload?.docs) ? payload.docs : [];
			const newSlots: ImageSlot[] = nextDocs.map((d: { id: number; settings?: { isNsfw?: boolean } }) => ({
				id: d.id,
				isNsfw: d.settings?.isNsfw === true || albumIsNsfw
			}));
			galleryImageSlots = [...galleryImageSlots, ...newSlots];
			loadedPage = Number(payload?.page ?? nextPage);
			hasNextPage = Boolean(payload?.hasNextPage);
		} catch {
			infiniteLoadError = 'Could not load more images. Scroll again to retry.';
		} finally {
			isLoadingMore = false;
		}
	}

	// Open lightbox on load when ?selected=<file media id> is present
	$effect(() => {
		const selected = page.url.searchParams.get('selected');
		if (!selected || visibleSlots.length === 0) return;
		const fileMediaId = parseInt(selected, 10);
		if (Number.isNaN(fileMediaId)) return;
		const idx = galleryImages.findIndex((m) => m.id === fileMediaId);
		if (idx !== -1) {
			pinnedLightboxFileMediaId = fileMediaId;
			lightboxIndex = idx;
			lightboxOpen = true;
			return;
		}
		const stillLoading = visibleSlots.some((s) => !slotFetchDone[s.id]);
		if (stillLoading) return;
		if (hasNextPage && !isLoadingMore) void loadNextImagePage();
	});

	function handlePolaroidResolved(galleryImageId: number, media: GalleryGridMedia) {
		slotMedia = { ...slotMedia, [galleryImageId]: media };
	}

	function markSlotFetchDone(galleryImageId: number) {
		slotFetchDone = { ...slotFetchDone, [galleryImageId]: true };
	}

	// Keep client pagination state aligned with server data across route/data updates.
	$effect(() => {
		const docs = (data.gallery.images?.docs ?? []) as { id: number; settings?: { isNsfw?: boolean } }[];
		galleryImageSlots = docs.map((d) => ({
			id: d.id,
			isNsfw: d.settings?.isNsfw === true || albumIsNsfw
		}));
		loadedPage = data.gallery.images?.page ?? 1;
		hasNextPage = data.gallery.images?.hasNextPage ?? false;
		slotMedia = {};
		slotFetchDone = {};
		isLoadingMore = false;
		infiniteLoadError = null;
	});

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
		if (!browser || !loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					void loadNextImagePage();
				}
			},
			{ rootMargin: `${LOAD_AHEAD_PX}px 0px` }
		);

		observer.observe(loadMoreSentinel);

		return () => observer.disconnect();
	});

	$effect(() => {
		if (!lightboxOpen || pinnedLightboxFileMediaId == null) return;
		const idx = galleryImages.findIndex((m) => m.id === pinnedLightboxFileMediaId);
		if (idx !== -1) lightboxIndex = idx;
	});
</script>

{#if shouldHideAlbum}
	<div class="gallery-page">
		<div class="gallery-header-wrap">
			<Panel hasBorder hasPadding>
				<header class="gallery-header">
					<h1>{data.gallery.title}</h1>
					<p class="gallery-hidden-notice">This album contains NSFW content and is hidden by your profile settings.</p>
				</header>
			</Panel>
		</div>
	</div>
{:else}
	<div class="gallery-page">
		<GalleryAlbumHeader gallery={data.gallery as GalleryAlbum} imageCount={totalImageCount} />

		<div class="gallery-grid">
			<Masonry
				items={visibleSlots}
				idKey="id"
				minColWidth={400}
				maxColWidth={600}
				gap={30}
				animate={false}
			>
				{#snippet children({ item: slot })}
					{@const idx = visibleSlots.findIndex((s) => s.id === slot.id)}
					{@const rotation = ((((slot.id * 2654435761 + 1013904223) % 2147483647) / 2147483647) * 14 - 7).toFixed(1)}
					<div class="gallery-grid__item" style:--rotation="{rotation}deg">
						<GalleryAlbumPolaroid
							galleryImageId={slot.id}
							{albumIsNsfw}
							{useProxy}
							priority={idx >= 0 && idx < 6}
							onResolved={(m) => handlePolaroidResolved(slot.id, m)}
							onFetchEnd={() => markSlotFetchDone(slot.id)}
							onClick={openLightboxForItem}
						/>
					</div>
				{/snippet}
			</Masonry>
		</div>

		{#if hasNextPage}
			<div class="gallery-load-more" bind:this={loadMoreSentinel} aria-hidden="true">
				{#if isLoadingMore}
					Loading more images...
				{:else}
					&nbsp;
				{/if}
			</div>
		{/if}

		{#if infiniteLoadError}
			<p class="gallery-load-error">{infiniteLoadError}</p>
		{/if}
	</div>

	<Lightbox
			images={galleryImages}
			totalCount={totalImageCount}
			initialIndex={lightboxIndex}
			bind:open={lightboxOpen}
			onClose={closeLightbox}
			onIndexChange={updateUrlForIndex}
			canLoadMore={hasNextPage}
			onRequestMore={loadNextImagePage}
			{useProxy}
		>
			{#snippet content({ image, index, total, imageSrc, isLoaded, placeholderSrc, onImageLoad, onClose, onPrevious, onNext, hasPrevious, hasNext, galleryImageId, useProxy })}
				<GalleryLightboxContent
					{image}
					{index}
					{total}
					{imageSrc}
					{isLoaded}
					{placeholderSrc}
					{onImageLoad}
					{onClose}
					{onPrevious}
					{onNext}
					{hasPrevious}
					{hasNext}
					gallery={data.gallery as GalleryAlbum}
					{galleryImageId}
					{useProxy}
				/>
			{/snippet}
		</Lightbox>
{/if}

<style>
	.gallery-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.gallery-header {
		text-align: center;
		margin-bottom: 0;
	}

	.gallery-header-wrap {
		margin-bottom: 3rem;
	}

	.gallery-header h1 {
		font-size: var(--fs-m);
		font-weight: 700;
		margin-bottom: 0.75rem;
		color: var(--color-primary-darkest);
		font-family: var(--font-oswald);
	}

	.gallery-hidden-notice {
		color: var(--color-tertiary);
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
	}

	.gallery-grid__item {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform 250ms ease;
	}

	.gallery-grid__item :global(.polaroid) {
		width: 100%;
		transform: rotate(var(--rotation, 0deg));
		cursor: pointer;
		transition: transform 250ms ease, box-shadow 250ms ease;
	}

	.gallery-grid__item:hover :global(.polaroid),
	.gallery-grid__item:focus-visible :global(.polaroid) {
		transform: rotate(0deg) scale(1.15);
		box-shadow: 0 1.5rem 3rem -0.5rem rgba(0, 0, 0, 0.45), 0 0.75rem 1.5rem -0.25rem rgba(0, 0, 0, 0.3);
		z-index: 10;
	}

	.gallery-grid__item:focus-visible {
		outline: none;
	}

	.gallery-load-more {
		height: 2rem;
		display: grid;
		place-items: center;
		color: var(--color-tertiary);
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
	}

	.gallery-load-error {
		margin: 0.5rem 0 0;
		text-align: center;
		color: #b00020;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
	}
</style>
