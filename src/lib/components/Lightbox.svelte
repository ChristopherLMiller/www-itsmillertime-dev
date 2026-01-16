<script lang="ts">
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import type { Media } from '../types/payload-types';

	type LightboxProps = {
		images: Media[];
		initialIndex?: number;
		open?: boolean;
		onClose?: () => void;
	};

	let { images, initialIndex = 0, open = $bindable(false), onClose }: LightboxProps = $props();

	let currentIndex = $state(initialIndex);
	let isLoaded = $state(false);

	const currentImage = $derived(images[currentIndex]);
	const hasPrevious = $derived(currentIndex > 0);
	const hasNext = $derived(currentIndex < images.length - 1);

	const imageSrc = $derived(
		currentImage?.sizes?.xlarge?.url ??
			currentImage?.sizes?.large?.url ??
			currentImage?.sizes?.medium?.url ??
			currentImage?.url ??
			null
	);

	const placeholderSrc = $derived(currentImage?.blurhash ?? null);

	const aspectRatio = $derived(
		currentImage?.width && currentImage?.height
			? currentImage.width / currentImage.height
			: 1
	);

	// Calculate dimensions for the container based on aspect ratio and viewport
	const containerDimensions = $derived.by(() => {
		const maxWidth = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1600;
		const maxHeight = typeof window !== 'undefined' ? window.innerHeight * 0.8 : 900;

		if (aspectRatio > maxWidth / maxHeight) {
			// Width-constrained
			return {
				width: maxWidth,
				height: maxWidth / aspectRatio
			};
		} else {
			// Height-constrained
			return {
				width: maxHeight * aspectRatio,
				height: maxHeight
			};
		}
	});

	function close() {
		open = false;
		onClose?.();
	}

	function previous() {
		if (hasPrevious) {
			currentIndex--;
			isLoaded = false;
		}
	}

	function next() {
		if (hasNext) {
			currentIndex++;
			isLoaded = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;

		switch (event.key) {
			case 'Escape':
				close();
				break;
			case 'ArrowLeft':
				previous();
				break;
			case 'ArrowRight':
				next();
				break;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close();
		}
	}

	// Preload images in the background
	$effect(() => {
		if (typeof window === 'undefined') return;

		// Preload all images when component mounts
		images.forEach((image) => {
			const src =
				image?.sizes?.xlarge?.url ??
				image?.sizes?.large?.url ??
				image?.sizes?.medium?.url ??
				image?.url;

			if (src) {
				const img = new Image();
				img.src = `${PUBLIC_PAYLOAD_URL}${src}`;
			}
		});
	});

	// Reset to initial index when initialIndex changes
	$effect(() => {
		currentIndex = initialIndex;
	});

	// Check if current image is cached and update loaded state
	$effect(() => {
		if (imageSrc && typeof window !== 'undefined') {
			const img = new Image();
			img.src = `${PUBLIC_PAYLOAD_URL}${imageSrc}`;

			// If image is complete (cached), set loaded immediately
			if (img.complete) {
				isLoaded = true;
			} else {
				isLoaded = false;
			}
		} else {
			isLoaded = false;
		}
	});

	$effect(() => {
		if (typeof document === 'undefined') return;

		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="lightbox" onclick={handleBackdropClick} role="presentation">
		<div class="lightbox__content">
			<button class="lightbox__close" onclick={close} aria-label="Close lightbox">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>

			<div
				class="lightbox__image-container"
				style:width="{containerDimensions.width}px"
				style:height="{containerDimensions.height}px"
			>
				{#key currentIndex}
					{#if placeholderSrc && !isLoaded}
						<img
							class="lightbox__image lightbox__image--placeholder"
							src={placeholderSrc}
							alt="Loading placeholder"
							aria-hidden="true"
						/>
					{/if}

					{#if imageSrc}
						<img
							class="lightbox__image lightbox__image--main"
							src={`${PUBLIC_PAYLOAD_URL}${imageSrc}`}
							alt={currentImage?.alt ?? ''}
							style:opacity={isLoaded ? 1 : 0}
							onload={() => (isLoaded = true)}
						/>
					{/if}
				{/key}
			</div>

			{#if hasPrevious}
				<button class="lightbox__nav lightbox__nav--prev" onclick={previous} aria-label="Previous image">
					<svg
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="15 18 9 12 15 6"></polyline>
					</svg>
				</button>
			{/if}

			{#if hasNext}
				<button class="lightbox__nav lightbox__nav--next" onclick={next} aria-label="Next image">
					<svg
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			{/if}

			{#if currentImage?.title || currentImage?.alt}
				<div class="lightbox__caption">
					{currentImage?.title || currentImage?.alt}
				</div>
			{/if}

			<div class="lightbox__counter">
				{currentIndex + 1} / {images.length}
			</div>
		</div>
	</div>
{/if}

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		animation: fadeIn 200ms ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.lightbox__content {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.lightbox__close {
		position: absolute;
		top: 0;
		right: 0;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		color: white;
		width: 48px;
		height: 48px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 200ms ease;
		z-index: 10;
	}

	.lightbox__close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox__image-container {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox__image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		transition: opacity 300ms ease;
		border-radius: 4px;
	}

	.lightbox__image--placeholder {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		filter: blur(20px);
		z-index: 0;
	}

	.lightbox__image--main {
		position: relative;
		z-index: 1;
	}

	.lightbox__nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0, 0, 0, 0.5);
		border: 2px solid rgba(255, 255, 255, 0.3);
		color: white;
		width: 48px;
		height: 48px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 200ms ease;
		backdrop-filter: blur(10px);
		z-index: 10;
	}

	.lightbox__nav:hover {
		background: rgba(0, 0, 0, 0.7);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.lightbox__nav--prev {
		left: 1rem;
	}

	.lightbox__nav--next {
		right: 1rem;
	}

	@media (max-width: 768px) {
		.lightbox__nav--prev {
			left: 0.5rem;
		}

		.lightbox__nav--next {
			right: 0.5rem;
		}
	}

	.lightbox__caption {
		color: white;
		text-align: center;
		font-size: 1.125rem;
		max-width: 800px;
		line-height: 1.5;
	}

	.lightbox__counter {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		font-weight: 500;
	}

	@media (prefers-reduced-motion: reduce) {
		.lightbox {
			animation: none;
		}

		.lightbox__image {
			transition: none;
		}
	}
</style>
