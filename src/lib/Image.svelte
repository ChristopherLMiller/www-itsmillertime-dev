<!-- ImageWithBlurhash.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Media } from './types/payload-types';

	// Props
	let {
		image,
		transitionName,
		hasBorder = false,
		hasLightbox = false,
		containerWidth = 0,
		containerHeight = 0,
		className = '',
		objectFit = 'cover'
	}: {
		image: Media;
		transitionName?: string;
		hasBorder?: boolean;
		hasLightbox?: boolean;
		containerWidth?: number;
		containerHeight?: number;
		className?: string;
		objectFit?: string;
	} = $props();

	// State
	let isLoaded = $state(false);
	let selectedImage: unknown = $state(undefined);
	let imgElement: HTMLImageElement | undefined | null = $state(null);
	let lightboxDialog: HTMLDialogElement | undefined | null = $state(null);
	let containerElement: HTMLDivElement | undefined = $state(undefined);
	let currentImageSrc: string | undefined | null = $state('');
	const aspectRatio = $derived((image.width && image.height && image?.width / image.height) || 1);

	// Function to select the best image based on container size
	function selectBestImage(targetWidth: number, targetHeight: number) {
		if (!image.sizes) return;
		// Sort images by how well they match the target dimensions
		const scored = Object.values(image?.sizes).map((img) => {
			const widthDiff = img.width && Math.abs(img.width - targetWidth);
			const heightDiff = img.height && Math.abs(img.height - targetHeight);
			const score = widthDiff && heightDiff ? widthDiff + heightDiff : 9999;

			return { ...img, score };
		});

		// Return the image with the lowest score (best match)
		return scored.sort((a, b) => a.score - b.score)[0];
	}

	// Function to load the selected image
	async function loadImage(imageSrc) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = imageSrc;
		});
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

			loadImage(bestImage.url)
				.then(() => {
					// Only set loaded if this is still the current image
					if (bestImage.url === currentImageSrc) {
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
	style="position: relative; overflow: hidden;"
	style:view-transition-name={transitionName}
>
	<!-- Base64 placeholder image (shown while loading) -->
	{#if image.blurhash}
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
				aspect-ratio: {aspectRatio > 1 ? aspectRatio : 1 / aspectRatio};
      "
		/>
	{/if}

	<!-- Actual image (shown when loaded) -->
	{#if selectedImage}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<img
			bind:this={imgElement}
			src={selectedImage.url}
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
				aspect-ratio: {aspectRatio > 1 ? aspectRatio : 1 / aspectRatio};
      "
			onload={() => {
				isLoaded = true;
			}}
			onclick={() => hasLightbox && lightboxDialog && lightboxDialog.showModal()}
		/>
	{/if}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
</div>
<dialog bind:this={lightboxDialog} class="lightbox" transition:fade>
	<div class="contents">
		<img src={image.url} alt={image.alt} class="lightbox-image" />
	</div>
</dialog>

<style>
	.image-container {
		display: block;
		min-height: 200px;
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
			padding: 5rem;
			margin: 0;
			max-width: 100vw;
			max-height: 100vh;
			background: rgba(0, 0, 0, 0.8);
		}

		.contents {
			display: flex;
			justify-content: center;
			align-items: center;
			width: 100%;
			height: 100%;
		}
	}
</style>
