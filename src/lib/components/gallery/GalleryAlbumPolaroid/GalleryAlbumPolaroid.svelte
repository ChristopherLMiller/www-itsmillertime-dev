<script lang="ts">
	import { browser } from '$app/environment';
	import Polaroid from '$lib/components/polaroid/Polaroid';
	import {
		buildPlaceholderGalleryMedia,
		displayableImageTitle,
		type GalleryGridMedia
	} from '$lib/utils/gallery-image-display';
	import { fetchGalleryImageFullForPolaroid } from '$lib/utils/gallery-image-full-fetch';

	type GalleryAlbumPolaroidProps = {
		galleryImageId: number;
		/** From parent cache when Masonry remounts this cell — avoids refetch + blur flash */
		cachedMedia?: GalleryGridMedia | null;
		/** width/height from server for placeholder aspect before fetch */
		layoutWidth?: number | null;
		layoutHeight?: number | null;
		layoutAspectRatio?: number;
		/** From server; shown while full preview fetch runs */
		initialBlurhash?: string | null;
		albumIsNsfw: boolean;
		useProxy: boolean;
		priority?: boolean;
		onResolved?: (media: GalleryGridMedia) => void;
		/** Called after the preview request finishes (success or failure). */
		onFetchEnd?: () => void;
		onClick?: (media: GalleryGridMedia) => void;
		/** Open lightbox on the shop tab (fold control). */
		onShopClick?: (media: GalleryGridMedia) => void;
		/** Tighter HTML `sizes` for grid srcset selection */
		responsiveSizes?: string;
		/** CMS shop listing pointer — no Medusa fetch on the grid */
		hasShopListing?: boolean;
	};

	const {
		galleryImageId,
		cachedMedia = null,
		layoutWidth,
		layoutHeight,
		layoutAspectRatio = 3 / 4,
		initialBlurhash = null,
		albumIsNsfw,
		useProxy,
		priority = false,
		onResolved,
		onFetchEnd,
		onClick,
		onShopClick,
		responsiveSizes = '(max-width: 900px) 100vw, min(500px, 45vw)',
		hasShopListing = false
	}: GalleryAlbumPolaroidProps = $props();

	let media = $state<GalleryGridMedia | null>(null);
	let loadError = $state<string | null>(null);

	const displayMedia = $derived(
		media ??
			buildPlaceholderGalleryMedia({
				galleryImageId,
				blurhash: initialBlurhash,
				width: layoutWidth,
				height: layoutHeight,
				aspectRatioFallback: layoutAspectRatio,
				isNsfw: albumIsNsfw
			})
	);

	$effect(() => {
		if (!browser) return;

		const id = galleryImageId;
		const fromParent = cachedMedia;

		if (fromParent != null && fromParent.galleryImageId === id) {
			media = fromParent;
			loadError = null;
			queueMicrotask(() => onFetchEnd?.());
			return;
		}

		// Do not AbortController + cleanup: parent re-renders (e.g. slotMedia updates) were
		// aborting in-flight work and causing canceled storms. Dedupe is in fetchGalleryImageFullForPolaroid.
		// Keep any already-shown preview for this id while a remount re-subscribes (avoid blank flash).
		let stale = false;
		if (media == null || media.galleryImageId !== id) {
			media = null;
			loadError = null;
		}

		void fetchGalleryImageFullForPolaroid(id, albumIsNsfw).then((m) => {
			if (stale) return;
			if (m) {
				media = m;
				onResolved?.(m);
			} else {
				loadError = 'Could not load image';
			}
			onFetchEnd?.();
		});

		return () => {
			stale = true;
		};
	});
</script>

{#if loadError}
	<div class="gallery-album-polaroid__error" role="status">{loadError}</div>
{:else}
	<div class="gallery-album-polaroid">
		<button
			type="button"
			class="gallery-album-polaroid__hit"
			class:gallery-album-polaroid__hit--pending={!media}
			aria-busy={!media}
			aria-label={media ? `View ${media.alt || 'image'} in lightbox` : 'Loading image'}
			onclick={() => {
				if (media) onClick?.(media);
			}}
		>
			{#key `${displayMedia.id}-${displayMedia.url ?? ''}-${displayMedia.needsProxy ? 'p' : 'd'}`}
				<Polaroid
					media={displayMedia}
					caption={displayableImageTitle(displayMedia.alt, displayMedia.filename) || undefined}
					interactive={false}
					clickable={false}
					enableViewTransition={false}
					adaptiveHeight={true}
					useProxy={useProxy || displayMedia.needsProxy}
					isNsfw={displayMedia.isNsfw}
					{priority}
					{responsiveSizes}
					disableContextMenu={true}
				/>
			{/key}
			{#if !media}
				<span class="gallery-album-polaroid__skeleton" aria-hidden="true">
					<span class="gallery-album-polaroid__skeleton-shine"></span>
				</span>
			{/if}
		</button>
		{#if hasShopListing && media}
			<button
				type="button"
				class="gallery-album-polaroid__shop"
				aria-label={`Open shop for ${media.alt || 'this image'}`}
				onclick={() => {
					(onShopClick ?? onClick)?.(media);
				}}
			>
				<span class="gallery-album-polaroid__shop-flap" aria-hidden="true"></span>
				<svg
					class="gallery-album-polaroid__shop-icon"
					viewBox="0 0 16 16"
					width="16"
					height="16"
					focusable="false"
					aria-hidden="true"
				>
					<path
						fill="currentColor"
						fill-rule="evenodd"
						d="M8 1.35 13.35 6.7v7.7H2.65V6.7L8 1.35Zm0 3.55a1.2 1.2 0 1 0 .001 2.401A1.2 1.2 0 0 0 8 4.9Z"
					/>
				</svg>
			</button>
		{/if}
	</div>
{/if}

<style lang="postcss">
	.gallery-album-polaroid {
		position: relative;
		width: 100%;
	}

	.gallery-album-polaroid__hit {
		position: relative;
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.gallery-album-polaroid__hit--pending {
		cursor: wait;
		pointer-events: none;
	}

	.gallery-album-polaroid__skeleton {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: 2px;
		overflow: hidden;
		pointer-events: none;
		background: color-mix(in oklch, var(--color-tertiary-darker, #2a2a2a) 12%, transparent);
	}

	.gallery-album-polaroid__skeleton-shine {
		position: absolute;
		inset: 0;
		transform: translateX(-120%);
		background: linear-gradient(
			105deg,
			transparent 35%,
			rgba(255, 255, 255, 0.1) 50%,
			transparent 65%
		);
		animation: gallery-polaroid-skeleton-shine 1.6s ease-in-out infinite;
	}

	@keyframes gallery-polaroid-skeleton-shine {
		100% {
			transform: translateX(120%);
		}
	}

	.gallery-album-polaroid__error {
		font-family: var(--font-roboto, sans-serif);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-align: center;
		padding: 2rem 0.5rem;
	}

	.gallery-album-polaroid__shop {
		position: absolute;
		z-index: 3;
		top: 0;
		right: 0;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		clip-path: polygon(0 0, 100% 0, 100% 100%);
		filter: drop-shadow(-1px 2px 1.5px rgba(47, 43, 37, 0.28));
	}

	.gallery-album-polaroid__shop-flap {
		position: absolute;
		inset: 0;
		background: var(--color-secondary);
		clip-path: polygon(0 0, 100% 0, 100% 100%);
	}

	.gallery-album-polaroid__shop-icon {
		position: absolute;
		top: 0.28rem;
		right: 0.22rem;
		display: block;
		width: 0.95rem;
		height: 0.95rem;
		color: #fff;
		pointer-events: none;
		transform-origin: 50% 42%;
		transform: rotate(45deg);
	}

	.gallery-album-polaroid__shop:hover .gallery-album-polaroid__shop-flap,
	.gallery-album-polaroid__shop:focus-visible .gallery-album-polaroid__shop-flap {
		background: var(--color-secondary-lighter, var(--color-secondary));
	}

	.gallery-album-polaroid__shop:focus-visible {
		outline: none;
	}

	.gallery-album-polaroid__shop:focus-visible .gallery-album-polaroid__shop-flap {
		box-shadow: inset 0 0 0 2px #fff;
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-album-polaroid__skeleton-shine {
			animation: none;
			opacity: 0.35;
			transform: none;
			background: rgba(255, 255, 255, 0.12);
		}
	}
</style>
