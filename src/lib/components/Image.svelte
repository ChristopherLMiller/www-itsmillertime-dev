<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { page } from '$app/state';
	import type { Media } from '../types/payload-types';
	import Icon from './Icon.svelte';
	import { getMediaUrl } from '$lib/utils/media-url';

	// All size keys to inspect — mimeType on each entry determines which <source> it belongs to
	const ALL_SIZE_KEYS = ['thumbnail', 'small', 'medium', 'large', 'xlarge'] as const;

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
		priority = false
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
	} = $props();

	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const shouldHide = $derived(isNsfw && nsfwPref === 'hide');
	const shouldBlur = $derived(isNsfw && nsfwPref === 'blur');
	let nsfwRevealed = $state(false);
	let isLoaded = $state(false);
	let isLoadFailed = $state(false);
	let lightboxDialog: HTMLDialogElement | undefined | null = $state(null);
	let currentGalleryIndex = $state(0);
	let imageTransitionDirection = $state<'left' | 'right'>('right');

	const aspectRatioStyle = $derived.by(() => {
		if (fixedAspectRatio != null) return String(fixedAspectRatio);
		const thumb = image?.sizes?.thumbnail;
		if (thumb?.width && thumb?.height) return `${thumb.width} / ${thumb.height}`;
		if (!image?.width || !image?.height) return '1';
		return `${image.width} / ${image.height}`;
	});

	// Build srcsets per MIME type using the mimeType field on each size entry.
	// The original image URL is intentionally excluded — it belongs only on the <img src>
	// fallback so the browser never picks a 6000px+ original via srcset.
	const { avifSrcset, jpegSrcset } = $derived.by(() => {
		const s = image?.sizes;
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
	});

	// Fallback src for the <img> tag — always the original JPEG
	const src = $derived(image?.url ? getMediaUrl(image.url, useProxy) : '');

	const currentLightboxImage = $derived(gallery ? gallery[currentGalleryIndex] : image);
	const hasGallery = $derived(gallery != null && gallery.length > 1);
	const canGoPrev = $derived(hasGallery && currentGalleryIndex > 0);
	const canGoNext = $derived(hasGallery && currentGalleryIndex < (gallery?.length ?? 0) - 1);

	function openLightbox() {
		if (!lightboxDialog) return;
		currentGalleryIndex = galleryIndex;
		lightboxDialog.showModal();
		document.body.style.overflow = 'hidden';
	}

	function closeLightbox() {
		if (!lightboxDialog) return;
		lightboxDialog.close();
		document.body.style.overflow = '';
	}

	function goToPrevImage() {
		if (canGoPrev) {
			imageTransitionDirection = 'left';
			currentGalleryIndex--;
		}
	}

	function goToNextImage() {
		if (canGoNext) {
			imageTransitionDirection = 'right';
			currentGalleryIndex++;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!lightboxDialog?.open) return;
		switch (e.key) {
			case 'Escape':
				closeLightbox();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				goToPrevImage();
				break;
			case 'ArrowRight':
				e.preventDefault();
				goToNextImage();
				break;
		}
	}

	function fadeScale(
		node: Element,
		params?: { duration?: number; delay?: number; easing?: (t: number) => number }
	) {
		return {
			css: (t: number, u: number) => {
				const fadeRet = fade(node, params);
				const scaleRet = scale(node, { ...params, start: 0.95 });
				return (fadeRet.css?.(t, u) ?? '') + (scaleRet.css?.(t, u) ?? '');
			}
		};
	}
</script>

{#if !shouldHide}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="image-container {className} {hasBorder ? 'border' : ''}"
		class:nsfw-blur={shouldBlur && !nsfwRevealed}
		style="position: relative; overflow: hidden; aspect-ratio: {aspectRatioStyle};"
		style:view-transition-name={transitionName}
		onmouseenter={() => { if (shouldBlur) nsfwRevealed = true; }}
		onmouseleave={() => { if (shouldBlur) nsfwRevealed = false; }}
		onclick={() => { if (shouldBlur && !nsfwRevealed) nsfwRevealed = true; }}
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
					src={src}
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

	{#if hasLightbox}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<dialog
			bind:this={lightboxDialog}
			class="lightbox"
			transition:fadeScale={{ duration: 400, easing: quintOut }}
			onclick={(e) => {
				if (e.target === lightboxDialog) closeLightbox();
			}}
			onkeydown={handleKeydown}
		>
			<button class="close-button" onclick={closeLightbox} aria-label="Close lightbox" type="button">
				<Icon name="x" size={32} />
			</button>

			<div class="lightbox-contents">
				<div class="image-wrapper">
					{#key currentGalleryIndex}
						<img
							src={currentLightboxImage?.url ? getMediaUrl(currentLightboxImage.url, useProxy) : ''}
							alt={currentLightboxImage?.alt ?? ''}
							class="lightbox-image"
							in:fly={{
								x: imageTransitionDirection === 'right' ? 100 : -100,
								duration: 300,
								easing: quintOut
							}}
							out:fly={{
								x: imageTransitionDirection === 'right' ? -100 : 100,
								duration: 300,
								easing: quintOut
							}}
						/>
					{/key}
				</div>

				{#if hasGallery && gallery}
					<div class="gallery-counter">
						{currentGalleryIndex + 1} / {gallery.length}
					</div>
				{/if}
			</div>

			{#if canGoPrev}
				<button
					class="nav-button nav-button--prev"
					onclick={goToPrevImage}
					aria-label="Previous image"
					type="button"
				>
					<Icon name="chevron-left" size={48} />
				</button>
			{/if}

			{#if canGoNext}
				<button
					class="nav-button nav-button--next"
					onclick={goToNextImage}
					aria-label="Next image"
					type="button"
				>
					<Icon name="chevron-right" size={48} />
				</button>
			{/if}
		</dialog>
	{/if}
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
		transition: opacity 0.3s ease, filter 0.4s ease;
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

	dialog {
		&.lightbox {
			border: 0;
			width: 100%;
			height: 100%;
			padding: 0;
			margin: 0;
			max-width: 100vw;
			max-height: 100vh;
			background: rgba(0, 0, 0, 0.95);
			position: relative;
		}

		.lightbox-contents {
			display: flex;
			justify-content: center;
			align-items: center;
			width: 100%;
			height: 100%;
			padding: 5rem;
			position: relative;
		}

		.image-wrapper {
			position: relative;
			width: 100%;
			height: 100%;
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.lightbox-image {
			position: absolute;
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			cursor: default;
		}
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		color: white;
		padding: 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		backdrop-filter: blur(10px);
	}

	.close-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
		transform: scale(1.05);
	}

	.close-button:active {
		transform: scale(0.95);
	}

	.nav-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 10;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 4px;
		color: white;
		padding: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		backdrop-filter: blur(10px);
	}

	.nav-button:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
		transform: translateY(-50%) scale(1.05);
	}

	.nav-button:active {
		transform: translateY(-50%) scale(0.95);
	}

	.nav-button--prev {
		left: 1rem;
	}

	.nav-button--next {
		right: 1rem;
	}

	.gallery-counter {
		position: absolute;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-family: var(--font-oswald, sans-serif);
		font-size: 0.875rem;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	@media (max-width: 768px) {
		.lightbox-contents {
			padding: 3rem 1rem;
		}

		.nav-button {
			padding: 0.75rem;
		}

		.nav-button--prev {
			left: 0.5rem;
		}

		.nav-button--next {
			right: 0.5rem;
		}

		.close-button {
			top: 0.5rem;
			right: 0.5rem;
		}

		.gallery-counter {
			bottom: 1rem;
			font-size: 0.75rem;
		}
	}
</style>
