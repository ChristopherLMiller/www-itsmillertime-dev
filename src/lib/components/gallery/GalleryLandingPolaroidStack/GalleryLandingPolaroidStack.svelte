<script lang="ts">
	import { browser } from '$app/environment';
	import PolaroidStack from '$lib/components/polaroid/PolaroidStack';
	import { buildPlaceholderGalleryMedia } from '$lib/utils/gallery-image-display';
	import { fetchGalleryImageFullForPolaroid } from '$lib/utils/gallery-image-full-fetch';
	import type { Media } from '$lib/types/payload-types';

	type GalleryLandingPolaroidStackProps = {
		galleryImageId: number;
		/** Primary polaroid + placeholder aspect ratio (width/height) from server */
		primaryAspectRatio?: number;
		coverWidth?: number | null;
		coverHeight?: number | null;
		/** Gallery-image blurhash from server; shown inside Polaroid while preview fetch runs */
		initialBlurhash?: string | null;
		albumId: number;
		caption: string;
		albumDescription?: string;
		useProxy: boolean;
		isNsfw: boolean;
		enableViewTransition?: boolean;
		hoverFlip?: boolean;
		onHoverExpand?: (albumId: number, signal?: AbortSignal) => void | Promise<void>;
		onNavigate: () => void;
		/** Secondary stack images (filled after album hover fetch) */
		extraImages: Media[];
		nsfwImageIds: Set<number>;
		/** Tighter `sizes` than Image default so srcset picks smaller files in the grid */
		polaroidResponsiveSizes?: string;
	};

	const {
		galleryImageId,
		primaryAspectRatio = 4 / 3,
		coverWidth = null,
		coverHeight = null,
		initialBlurhash = null,
		albumId,
		caption,
		albumDescription,
		useProxy,
		isNsfw,
		enableViewTransition = true,
		hoverFlip = true,
		onHoverExpand,
		onNavigate,
		extraImages,
		nsfwImageIds,
		polaroidResponsiveSizes = '(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 18rem'
	}: GalleryLandingPolaroidStackProps = $props();

	let primary = $state<Media | null>(null);
	let loadError = $state<string | null>(null);

	const primaryForStack = $derived(
		primary ??
			buildPlaceholderGalleryMedia({
				galleryImageId,
				blurhash: initialBlurhash,
				width: coverWidth,
				height: coverHeight,
				aspectRatioFallback: primaryAspectRatio,
				isNsfw
			})
	);

	$effect(() => {
		if (!browser) return;

		const id = galleryImageId;
		let cancelled = false;

		primary = null;
		loadError = null;

		// Coalesces with other landing covers into /api/gallery/images/batch?data=basic
		void fetchGalleryImageFullForPolaroid(id, isNsfw).then((media) => {
			if (cancelled) return;
			if (media) {
				primary = media;
			} else {
				loadError = 'Could not load image';
			}
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if loadError}
	<div class="gallery-landing-polaroid__error" role="status">{loadError}</div>
{:else}
	{@const cover = primaryForStack}
	{@const coverNeedsProxy =
		useProxy ||
		Boolean(
			cover &&
				typeof cover === 'object' &&
				'needsProxy' in cover &&
				(cover as { needsProxy?: boolean }).needsProxy === true
		)
	}
	{#key `${cover.id}-${cover.url ?? ''}-${coverNeedsProxy ? 'p' : 'd'}`}
		<PolaroidStack
			primary={cover}
			images={[cover, ...extraImages.filter((m) => m.id !== cover.id)]}
			{caption}
			{primaryAspectRatio}
			{enableViewTransition}
			{hoverFlip}
			albumTitle={caption}
			{albumDescription}
			useProxy={coverNeedsProxy}
			{isNsfw}
			{nsfwImageIds}
			{albumId}
			{onHoverExpand}
			{onNavigate}
			{polaroidResponsiveSizes}
			disableContextMenu={true}
		/>
	{/key}
{/if}

<style lang="postcss">
	.gallery-landing-polaroid__error {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-align: center;
		padding: 2rem 1rem;
	}
</style>
