<script lang="ts">
	import { browser } from '$app/environment';
	import PolaroidStack from '$lib/components/PolaroidStack.svelte';
	import { buildPlaceholderGalleryMedia } from '$lib/utils/gallery-image-display';
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

	function isMedia(value: unknown): value is Media {
		return typeof value === 'object' && value !== null && 'id' in value && 'url' in value;
	}

	$effect(() => {
		if (!browser) return;

		const id = galleryImageId;
		let cancelled = false;
		const ac = new AbortController();

		primary = null;
		loadError = null;

		(async () => {
			try {
				const res = await fetch(`/api/gallery/images/${id}?data=basic`, { signal: ac.signal });
				if (!res.ok) {
					if (!cancelled)
						loadError = res.status === 404 ? 'Image unavailable' : 'Could not load image';
					return;
				}
				const data: unknown = await res.json();
				if (cancelled) return;
				if (isMedia(data)) {
					primary = data;
				} else {
					loadError = 'Invalid response';
				}
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				if (!cancelled) loadError = 'Could not load image';
			}
		})();

		return () => {
			cancelled = true;
			ac.abort();
		};
	});
</script>

{#if loadError}
	<div class="gallery-landing-polaroid__error" role="status">{loadError}</div>
{:else}
	{@const cover = primaryForStack}
	{#key `${cover.id}-${cover.url ?? ''}`}
		<PolaroidStack
			primary={cover}
			images={[cover, ...extraImages.filter((m) => m.id !== cover.id)]}
			{caption}
			{primaryAspectRatio}
			{enableViewTransition}
			{hoverFlip}
			albumTitle={caption}
			{albumDescription}
			{useProxy}
			{isNsfw}
			{nsfwImageIds}
			{albumId}
			{onHoverExpand}
			{onNavigate}
			{polaroidResponsiveSizes}
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
