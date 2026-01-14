<!-- ImageWithBlurhash.svelte -->
<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Media } from '../types/payload-types';
	import Icon from './Icon.svelte';
	import {PUBLIC_PAYLOAD_URL } from '$env/static/public';

	// Props
	let {
		image,
		transitionName,
		hasBorder = false,
		hasLightbox = false,
		containerWidth = 0,
		containerHeight = 0,
		className = '',
		objectFit = 'cover',
		gallery = undefined,
		galleryIndex = 0
	}: {
		image: Media;
		transitionName?: string;
		hasBorder?: boolean;
		hasLightbox?: boolean;
		containerWidth?: number;
		containerHeight?: number;
		className?: string;
		objectFit?: string;
		gallery?: Media[];
		galleryIndex?: number;
	} = $props();

	// State
	let isLoaded = $state(false);
	let selectedImage: unknown = $state(undefined);
	let imgElement: HTMLImageElement | undefined | null = $state(null);
	let lightboxDialog: HTMLDialogElement | undefined | null = $state(null);
	let containerElement: HTMLDivElement | undefined = $state(undefined);
	let currentImageSrc: string | undefined | null = $state('');
	let currentGalleryIndex = $state(0);
	let imageTransitionDirection = $state<'left' | 'right'>('right');
	const aspectRatio = $derived((image?.width && image?.height && image?.width / image.height) || 1);

	// Derived state for current lightbox image
	const currentLightboxImage = $derived(gallery ? gallery[currentGalleryIndex] : image);
	const hasGallery = $derived(gallery && gallery.length > 1);
	const canGoPrev = $derived(hasGallery && currentGalleryIndex > 0);
	const canGoNext = $derived(hasGallery && currentGalleryIndex < gallery!.length - 1);

	// Function to select the best image based on container size
	function selectBestImage(targetWidth: number, targetHeight: number) {
		if (!image.sizes) return;

		const desiredSizesToUse = ['small', 'medium', 'large', 'xlarge', 'thumbnail'];
		const filteredSizes = desiredSizesToUse.reduce((acc, size) => {
			if (image.sizes[size]) {
				acc[size] = image.sizes[size];
			}
			return acc;
		}, {});

		// Sort images by how well they match the target dimensions
		const scored = Object.values(filteredSizes).map((img) => {
			const widthDiff = img.width && Math.abs(img.width - targetWidth);
			const heightDiff = img.height && Math.abs(img.height - targetHeight);
			const score = widthDiff && heightDiff ? widthDiff + heightDiff : 9999;
			return { ...img, score };
		});

		// Return the image with the lowest score (best match)
		return scored.sort((a, b) => a.score - b.score)[0];
	}

	// Function to load the selected image
	async function loadImage(imageSrc: string) {
		const filename = imageSrc.split('/').pop();

		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = imageSrc;
		});
	}

	// Gallery navigation functions
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

	// Custom transition to combine fade and scale
	function fadeScale(node, params) {
		return {
			css: (t, u) => {
				const fadeStyle = fade(node, params).css(t, u);
				const scaleStyle = scale(node, { ...params, start: 0.95 }).css(t, u);
				return fadeStyle + scaleStyle;
			}
		};
	}

	// Effect to handle image selection and loading
	$effect(() => {
		if (image.sizes && !Object.keys(image.sizes).length) return;

		const width = containerWidth || containerElement?.offsetWidth || 300;
		const height = containerHeight || containerElement?.offsetHeight || 200;

		// Select appropriate image
		const bestImage = selectBestImage(width, height);

		// Only update if we have a new image source
		if (bestImage && bestImage.url !== currentImageSrc) {
			currentImageSrc = bestImage.url;
			selectedImage = bestImage;
			isLoaded = false;

			loadImage(`${PUBLIC_PAYLOAD_URL}${bestImage.url}`)
				.then(() => {
					// Only set loaded if this is still the current image
					if (`${PUBLIC_PAYLOAD_URL}${bestImage.url}` === currentImageSrc) {
						isLoaded = true;
					}
				})
				.catch((error) => {
					console.error('Failed to load image:', error);
				});
		}
	});
</script>

<div
	bind:this={containerElement}
	class="image-container {className} {hasBorder ? 'border' : ''}"
	style="position: relative; overflow: hidden; aspect-ratio: {aspectRatio > 1 ? aspectRatio : 1 / aspectRatio};"
	style:view-transition-name={transitionName}
>
	<!-- Base64 placeholder image (shown while loading) -->
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

	<!-- Actual image (shown when loaded) -->
	{#if selectedImage}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<img
			bind:this={imgElement}
			src={`${PUBLIC_PAYLOAD_URL}${selectedImage.url}`}
			alt={image.alt}
			width={selectedImage.width}
			height={selectedImage.height}
			loading="lazy"
			style="
        width: 100%;
        height: 100%;
        object-fit: {objectFit};
        transition: opacity 0.3s ease;
        opacity: {isLoaded ? 1 : 0};
        cursor: {hasLightbox ? 'pointer' : 'default'};
      "
			onload={() => {
				isLoaded = true;
			}}
			onclick={hasLightbox ? openLightbox : undefined}
		/>
	{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
</div>
{#if hasLightbox}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={lightboxDialog}
		class="lightbox"
		transition:fadeScale={{ duration: 400, easing: quintOut }}
		onclick={(e) => {
			// Close if the user clicked the backdrop
			if (e.target === lightboxDialog) {
				closeLightbox();
			}
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
						src={`${PUBLIC_PAYLOAD_URL}${currentLightboxImage.url}`}
						alt={currentLightboxImage.alt}
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

			{#if hasGallery}
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

<style>
	.image-container {
		display: block;
		background-color: #f0f0f0;

		&.border {
			border: 5px solid var(--color-primary-darker);
		}
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

		&:hover {
			background: rgba(255, 255, 255, 0.2);
			border-color: rgba(255, 255, 255, 0.5);
			transform: scale(1.05);
		}

		&:active {
			transform: scale(0.95);
		}
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

		&:hover {
			background: rgba(255, 255, 255, 0.2);
			border-color: rgba(255, 255, 255, 0.5);
			transform: translateY(-50%) scale(1.05);
		}

		&:active {
			transform: translateY(-50%) scale(0.95);
		}
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

	/* Responsive adjustments */
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
