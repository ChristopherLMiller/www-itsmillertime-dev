<script lang="ts">
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import type { Media } from '$lib/types/payload-types';
	import Icon from '$lib/components/Icon';
	import { getMediaUrl, isGifMedia } from '$lib/utils/media-url';
	import { mediaToPhotoSwipeSlide } from '$lib/utils/photoswipe/media-to-slide';
	import { preventContextMenu } from '$lib/utils/prevent-context-menu';
	import type PhotoSwipe from 'photoswipe';

	// All size keys to inspect — mimeType on each entry determines which <source> it belongs to
	const ALL_SIZE_KEYS = ['thumbnail', 'small', 'medium', 'large', 'xlarge'] as const;

	function buildSrcsets(img: Media | null | undefined) {
		// Payload AVIF/JPEG derivatives of animated GIFs are often vertical frame strips.
		if (isGifMedia(img)) {
			return { avifSrcset: '', jpegSrcset: '' };
		}
		const s = img?.sizes;
		const avif: string[] = [];
		const jpeg: string[] = [];
		for (const key of ALL_SIZE_KEYS) {
			const size = s?.[key];
			if (!size?.url || size.width == null) continue;
			const entry = `${getMediaUrl(size.url, useProxy)} ${size.width}w`;
			if (size.mimeType === 'image/avif') {
				avif.push(entry);
			} else {
				jpeg.push(entry);
			}
		}
		return { avifSrcset: avif.join(', '), jpegSrcset: jpeg.join(', ') };
	}

	// Props
	let {
		image,
		transitionName,
		hasBorder = false,
		hasLightbox = false,
		cursorPointer = false,
		className = '',
		objectFit = 'cover',
		gallery = undefined,
		galleryIndex = 0,
		useProxy = false,
		isNsfw = false,
		/** When set, use this fixed aspect ratio (width/height) instead of image dimensions */
		fixedAspectRatio,
		/** HTML sizes attribute for source selection. Default suits gallery grid (400-600px columns). */
		sizes = '(min-width: 1200px) 600px, (min-width: 768px) 50vw, 100vw',
		/** When true, use loading="eager" and fetchpriority="high" for above-the-fold images */
		priority = false,
		/** When true, block right-click / long-press save menu on images */
		disableContextMenu = false
	}: {
		image: Media;
		transitionName?: string;
		hasBorder?: boolean;
		hasLightbox?: boolean;
		/** When true, show pointer cursor (e.g. when parent opens lightbox) */
		cursorPointer?: boolean;
		className?: string;
		objectFit?: string;
		gallery?: Media[];
		galleryIndex?: number;
		useProxy?: boolean;
		isNsfw?: boolean;
		/** When set, use this fixed aspect ratio (width/height) instead of image dimensions */
		fixedAspectRatio?: number;
		/** HTML sizes attribute for responsive image selection */
		sizes?: string;
		/** When true, use loading="eager" and fetchpriority="high" for above-the-fold images */
		priority?: boolean;
		/** When true, block right-click / long-press save menu on images */
		disableContextMenu?: boolean;
	} = $props();

	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const shouldHide = $derived(isNsfw && nsfwPref === 'hide');
	const shouldBlur = $derived(isNsfw && nsfwPref === 'blur');
	let nsfwRevealed = $state(false);
	let isLoaded = $state(false);
	let isLoadFailed = $state(false);
	let thumbImg: HTMLImageElement | null = $state(null);
	let pswpInstance: PhotoSwipe | null = null;

	const aspectRatioStyle = $derived.by(() => {
		if (fixedAspectRatio != null) return String(fixedAspectRatio);
		// GIF thumbnails can be filmstrips with bogus height — prefer original dims.
		if (isGifMedia(image)) {
			if (image?.width && image?.height) return `${image.width} / ${image.height}`;
			return '1';
		}
		const thumb = image?.sizes?.thumbnail;
		if (thumb?.width && thumb?.height) return `${thumb.width} / ${thumb.height}`;
		if (!image?.width || !image?.height) return '1';
		return `${image.width} / ${image.height}`;
	});

	// Build srcsets for the main card image. The original image URL is intentionally excluded
	// from all srcsets — it belongs only on the <img src> fallback so the browser never picks
	// a huge original via srcset.
	const { avifSrcset, jpegSrcset } = $derived(buildSrcsets(image));

	// Fallback src for the <img> tag — always the original JPEG
	const src = $derived(image?.url ? getMediaUrl(image.url, useProxy) : '');

	async function openLightbox() {
		const items = gallery && gallery.length > 0 ? gallery : [image];
		const startIndex = gallery ? galleryIndex : 0;
		const thumbCropped = objectFit === 'cover';

		const dataSource = items.map((item, index) =>
			mediaToPhotoSwipeSlide(item, {
				useProxy,
				element: index === startIndex ? thumbImg : null,
				thumbCropped
			})
		);

		const [{ default: PhotoSwipe }] = await Promise.all([
			import('photoswipe'),
			import('photoswipe/style.css')
		]);

		pswpInstance?.destroy();

		const pswp = new PhotoSwipe({
			dataSource,
			index: startIndex,
			bgOpacity: 0.95,
			showHideAnimationType: 'zoom',
			wheelToZoom: true,
			pinchToClose: false,
			// Keep UI chrome minimal; zoom/pan/pinch are the point.
			padding: { top: 24, bottom: 24, left: 16, right: 16 }
		});

		if (disableContextMenu) {
			pswp.on('contentActivate', ({ content }) => {
				content.element?.addEventListener('contextmenu', preventContextMenu);
			});
		}

		pswp.on('destroy', () => {
			if (pswpInstance === pswp) pswpInstance = null;
		});

		pswpInstance = pswp;
		pswp.init();
	}

	onDestroy(() => {
		pswpInstance?.destroy();
		pswpInstance = null;
	});
</script>

{#if !shouldHide}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="image-container {className} {hasBorder ? 'border' : ''}"
		class:nsfw-blur={shouldBlur && !nsfwRevealed}
		style="position: relative; overflow: hidden; aspect-ratio: {aspectRatioStyle};"
		style:view-transition-name={transitionName}
		onmouseenter={() => {
			if (shouldBlur) nsfwRevealed = true;
		}}
		onmouseleave={() => {
			if (shouldBlur) nsfwRevealed = false;
		}}
		onclick={() => {
			if (shouldBlur && !nsfwRevealed) nsfwRevealed = true;
		}}
	>
		{#if image?.blurhash}
			<img
				src={image.blurhash}
				alt="Loading placeholder"
				class="placeholder-image"
				style="
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					object-fit: {objectFit};
					transition: opacity 0.3s ease;
					opacity: {isLoaded ? 0 : 1};
					pointer-events: none;
					filter: blur(5px);
				"
			/>
		{/if}

		{#if src}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<picture class="main-picture">
				<source type="image/avif" srcset={avifSrcset || undefined} {sizes} />
				<source type="image/jpeg" srcset={jpegSrcset || undefined} {sizes} />
				<img
					bind:this={thumbImg}
					{src}
					alt={image.alt ?? ''}
					width={image.width ?? undefined}
					height={image.height ?? undefined}
					loading={priority ? 'eager' : 'lazy'}
					fetchpriority={priority ? 'high' : undefined}
					decoding="async"
					class="main-image"
					style="
						object-fit: {objectFit};
						opacity: {isLoaded ? 1 : 0};
						cursor: {hasLightbox || shouldBlur || cursorPointer ? 'pointer' : 'default'};
					"
					onload={() => {
						isLoaded = true;
						isLoadFailed = false;
					}}
					onerror={() => {
						isLoadFailed = true;
					}}
					onclick={hasLightbox ? openLightbox : undefined}
					oncontextmenu={disableContextMenu ? preventContextMenu : undefined}
				/>
			</picture>
		{/if}

		{#if isLoadFailed}
			<div class="error-overlay" aria-live="polite">
				<Icon name="x" size={48} color="white" />
				<span>Failed to load</span>
			</div>
		{/if}

		{#if shouldBlur && !nsfwRevealed}
			<div class="nsfw-overlay">
				<Icon name="eye" size={32} color="white" />
				<span>Hover to view</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	.image-container {
		display: block;
		background-color: #f0f0f0;

		&.border {
			border: 5px solid var(--color-primary-darker);
		}
	}

	.main-picture {
		display: block;
		width: 100%;
		height: 100%;
	}

	.main-image {
		display: block;
		width: 100%;
		height: 100%;
		transition:
			opacity 0.3s ease,
			filter 0.4s ease;
	}

	.image-container.nsfw-blur :global(.main-image) {
		filter: blur(24px) brightness(0.6);
	}

	.error-overlay,
	.nsfw-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		z-index: 2;
		pointer-events: none;
		color: white;
		font-family: var(--font-oswald, sans-serif);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
	}

	.error-overlay {
		background: rgba(0, 0, 0, 0.6);
	}
</style>
