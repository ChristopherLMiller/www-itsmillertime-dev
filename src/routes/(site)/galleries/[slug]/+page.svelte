<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Masonry from 'svelte-bricks';
	import Panel from '$lib/components/Panel';
	import GalleryAlbumHeader from '$lib/components/gallery/GalleryAlbumHeader';
	import GalleryAlbumPolaroid from '$lib/components/gallery/GalleryAlbumPolaroid';
	import Lightbox from '$lib/components/gallery/Lightbox';
	import GalleryLightboxContent from '$lib/components/gallery/GalleryLightboxContent';
	import type { GalleryGridMedia } from '$lib/utils/gallery-image-display';
	import { fetchGalleryImageFullForPolaroid } from '$lib/utils/gallery-image-full-fetch';
	import { cssAspectRatioFromDimensions } from '$lib/utils/aspect-ratio';
	import type { GalleryAlbum } from '$lib/types/payload-types';

	const IMAGE_BATCH_SIZE = 30;
	const LOAD_AHEAD_PX = 2400;

	const { data } = $props();

	const isRestricted = $derived(
		data.gallery.settings?.isNsfw === true || data.gallery.settings?.visibility !== 'ALL'
	);
	const useProxy = $derived(isRestricted);
	const albumIsNsfw = $derived(data.gallery.settings?.isNsfw === true);
	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const shouldHideAlbum = $derived(albumIsNsfw && nsfwPref === 'hide');
	const isDirectLinkEntry = $derived(data.selectedGalleryImageId != null);

	type ImageSlot = {
		id: number;
		isNsfw: boolean;
		width?: number | null;
		height?: number | null;
		blurhash?: string | null;
	};

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
	/** Only reset infinite-scroll client state when navigating to a different album */
	let syncedGalleryId = $state<number | null>(null);
	let directLinkDismissed = $state(false);
	let directLinkResolving = $state(false);
	let directLinkFailed = $state(false);

	const showAlbumChrome = $derived(!isDirectLinkEntry || directLinkDismissed);

	function galleryImageLinkId(media: GalleryGridMedia): number {
		return media.galleryImageId ?? media.id;
	}

	function findGalleryImageIndex(selectedId: number): number {
		return galleryImages.findIndex(
			(m) => m.id === selectedId || m.galleryImageId === selectedId || galleryImageLinkId(m) === selectedId
		);
	}

	function injectResolvedMedia(media: GalleryGridMedia) {
		const galleryImageId = galleryImageLinkId(media);
		slotMedia = { ...slotMedia, [galleryImageId]: media };
		slotFetchDone = { ...slotFetchDone, [galleryImageId]: true };

		if (!galleryImageSlots.some((slot) => slot.id === galleryImageId)) {
			galleryImageSlots = [
				{
					id: galleryImageId,
					width: media.width,
					height: media.height,
					blurhash: media.blurhash,
					isNsfw: media.isNsfw
				},
				...galleryImageSlots
			];
		}
	}

	function setSelectedUrl(selectedId: number | null) {
		if (!browser) return;
		const nextUrl = new URL(window.location.href);
		if (selectedId == null) {
			nextUrl.searchParams.delete('selected');
		} else {
			nextUrl.searchParams.set('selected', String(selectedId));
		}
		replaceState(nextUrl, page.state);
	}

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
		const idx = findGalleryImageIndex(galleryImageLinkId(item));
		if (idx === -1) return;
		pinnedLightboxFileMediaId = galleryImageLinkId(item);
		lightboxIndex = idx;
		lightboxOpen = true;
		setSelectedUrl(galleryImageLinkId(item));
	}

	function closeLightbox() {
		pinnedLightboxFileMediaId = null;
		directLinkDismissed = true;
		setSelectedUrl(null);
	}

	function updateUrlForIndex(index: number) {
		const media = galleryImages[index];
		if (media == null) return;
		pinnedLightboxFileMediaId = galleryImageLinkId(media);
		setSelectedUrl(galleryImageLinkId(media));
	}

	async function loadNextImagePage() {
		if (!browser || isLoadingMore || !hasNextPage) return;
		isLoadingMore = true;
		infiniteLoadError = null;

		try {
			const nextPage = loadedPage + 1;
			const res = await fetch(
				`/api/gallery/albums/${data.gallery.id}/paged?page=${nextPage}&limit=${IMAGE_BATCH_SIZE}&idsOnly=1`
			);
			if (!res.ok) throw new Error(`Failed to load page ${nextPage}`);

			const payload = await res.json();
			const nextDocs = Array.isArray(payload?.docs) ? payload.docs : [];
			const newSlots: ImageSlot[] = nextDocs.map(
				(d: {
					id: number;
					width?: number | null;
					height?: number | null;
					blurhash?: string | null;
					settings?: { isNsfw?: boolean };
				}) => ({
					id: d.id,
					width: d.width,
					height: d.height,
					blurhash: d.blurhash,
					isNsfw: d.settings?.isNsfw === true || albumIsNsfw
				})
			);
			galleryImageSlots = [...galleryImageSlots, ...newSlots];
			loadedPage = Number(payload?.page ?? nextPage);
			hasNextPage = Boolean(payload?.hasNextPage);
		} catch {
			infiniteLoadError = 'Could not load more images. Scroll again to retry.';
		} finally {
			isLoadingMore = false;
		}
	}

	async function resolveDirectLink(selectedId: number) {
		if (directLinkResolving || directLinkFailed) return;
		directLinkResolving = true;
		directLinkFailed = false;

		try {
			const media = await fetchGalleryImageFullForPolaroid(selectedId, albumIsNsfw);
			if (!media) {
				directLinkFailed = true;
				directLinkDismissed = true;
				setSelectedUrl(null);
				return;
			}

			injectResolvedMedia(media);
			const idx = findGalleryImageIndex(selectedId);
			if (idx === -1) return;

			pinnedLightboxFileMediaId = selectedId;
			lightboxIndex = idx;
			lightboxOpen = true;
		} finally {
			directLinkResolving = false;
		}
	}

	// Open lightbox on load when ?selected=<gallery-image id> is present
	$effect(() => {
		const selectedId = data.selectedGalleryImageId;
		if (!browser || selectedId == null) return;

		const idx = findGalleryImageIndex(selectedId);
		if (idx !== -1) {
			pinnedLightboxFileMediaId = selectedId;
			lightboxIndex = idx;
			lightboxOpen = true;
			return;
		}

		if (directLinkResolving || directLinkFailed) return;

		void resolveDirectLink(selectedId);
	});

	function handlePolaroidResolved(galleryImageId: number, media: GalleryGridMedia) {
		slotMedia = { ...slotMedia, [galleryImageId]: media };
	}

	function markSlotFetchDone(galleryImageId: number) {
		slotFetchDone = { ...slotFetchDone, [galleryImageId]: true };
	}

	// Seed first page from server when the album changes only. Do not clear slotMedia on
	// arbitrary data refreshes or Masonry-driven rerenders — that was wiping resolved polaroids.
	$effect(() => {
		const galleryId = data.gallery.id;
		const docs = (data.gallery.images?.docs ?? []) as {
			id: number;
			width?: number | null;
			height?: number | null;
			blurhash?: string | null;
			settings?: { isNsfw?: boolean };
		}[];

		if (syncedGalleryId === galleryId) return;

		syncedGalleryId = galleryId;
		directLinkDismissed = false;
		directLinkResolving = false;
		directLinkFailed = false;
		galleryImageSlots = docs.map((d) => ({
			id: d.id,
			width: d.width,
			height: d.height,
			blurhash: d.blurhash,
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
		const idx = findGalleryImageIndex(pinnedLightboxFileMediaId);
		if (idx !== -1) lightboxIndex = idx;
	});
</script>

{#if shouldHideAlbum}
	<div class="gallery-page">
		<div class="gallery-header-wrap">
			<Panel hasBorder hasPadding>
				<header class="gallery-header">
					<h1>{data.gallery.title}</h1>
					<p class="gallery-hidden-notice">
						This album contains NSFW content and is hidden by your profile settings.
					</p>
				</header>
			</Panel>
		</div>
	</div>
{:else if showAlbumChrome}
	<div class="gallery-page">
		<GalleryAlbumHeader
			gallery={data.gallery as unknown as GalleryAlbum}
			imageCount={totalImageCount}
		/>

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
					{@const rotation = (
						(((slot.id * 2654435761 + 1013904223) % 2147483647) / 2147483647) * 14 -
						7
					).toFixed(1)}
					{@const layoutAspect = cssAspectRatioFromDimensions(
						slot.width ?? undefined,
						slot.height ?? undefined,
						3 / 4
					)}
					<div class="gallery-grid__item">
						<div class="gallery-grid__tilt" style:transform="rotate({rotation}deg)">
							<GalleryAlbumPolaroid
								galleryImageId={slot.id}
								cachedMedia={slotMedia[slot.id]}
								layoutWidth={slot.width}
								layoutHeight={slot.height}
								layoutAspectRatio={layoutAspect}
								initialBlurhash={slot.blurhash ?? null}
								{albumIsNsfw}
								{useProxy}
								priority={idx >= 0 && idx < 6}
								onResolved={(m) => handlePolaroidResolved(slot.id, m)}
								onFetchEnd={() => markSlotFetchDone(slot.id)}
								onClick={openLightboxForItem}
							/>
						</div>
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
{:else if directLinkFailed}
	<div class="gallery-page">
		<div class="gallery-header-wrap">
			<Panel hasBorder hasPadding>
				<header class="gallery-header">
					<h1>{data.gallery.title}</h1>
					<p class="gallery-hidden-notice">This image is not available.</p>
				</header>
			</Panel>
		</div>
	</div>
{/if}

{#if !shouldHideAlbum}
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
		{#snippet content({
			image,
			index,
			total,
			imageSrc,
			isLoaded,
			placeholderSrc,
			onImageLoad,
			onClose,
			onPrevious,
			onNext,
			hasPrevious,
			hasNext,
			galleryImageId,
			useProxy
		})}
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
				gallery={data.gallery as unknown as GalleryAlbum}
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
	}

	.gallery-grid__tilt {
		width: 100%;
		transform-origin: center;
		transition:
			transform 250ms ease,
			box-shadow 250ms ease;
	}

	.gallery-grid__item:hover .gallery-grid__tilt,
	.gallery-grid__item:focus-within .gallery-grid__tilt {
		transform: rotate(0deg) scale(1.15) !important;
		z-index: 10;
	}

	.gallery-grid__item :global(.polaroid) {
		width: 100%;
		cursor: pointer;
		transition: box-shadow 250ms ease;
	}

	.gallery-grid__item:hover :global(.polaroid),
	.gallery-grid__item:focus-within :global(.polaroid) {
		box-shadow:
			0 1.5rem 3rem -0.5rem rgba(0, 0, 0, 0.45),
			0 0.75rem 1.5rem -0.25rem rgba(0, 0, 0, 0.3);
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
