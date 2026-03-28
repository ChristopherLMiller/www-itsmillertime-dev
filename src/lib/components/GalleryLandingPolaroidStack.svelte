<script lang="ts">
	import { browser } from '$app/environment';
	import PolaroidStack from '$lib/components/PolaroidStack.svelte';
	import type { Media } from '$lib/types/payload-types';

	type GalleryLandingPolaroidStackProps = {
		galleryImageId: number;
		/** Primary polaroid + skeleton aspect ratio (width/height) from server */
		primaryAspectRatio?: number;
		/** Gallery-image blurhash from server; shown while preview fetch runs */
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
	};

	const {
		galleryImageId,
		primaryAspectRatio = 4 / 3,
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
		nsfwImageIds
	}: GalleryLandingPolaroidStackProps = $props();

	let primary = $state<Media | null>(null);
	let loadError = $state<string | null>(null);

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
				const res = await fetch(`/api/gallery-image-preview/${id}`, { signal: ac.signal });
				if (!res.ok) {
					if (!cancelled) loadError = res.status === 404 ? 'Image unavailable' : 'Could not load image';
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
{:else if primary}
	{@const cover = primary}
	<PolaroidStack
		primary={cover}
		images={[cover, ...extraImages.filter((m) => m.id !== cover.id)]}
		{caption}
		{primaryAspectRatio}
		{enableViewTransition}
		{hoverFlip}
		albumTitle={caption}
		albumDescription={albumDescription}
		{useProxy}
		{isNsfw}
		{nsfwImageIds}
		{albumId}
		{onHoverExpand}
		{onNavigate}
	/>
{:else}
	<div
		class="gallery-landing-polaroid__skeleton"
		class:gallery-landing-polaroid__skeleton--blurhash={!!initialBlurhash}
		aria-hidden="true"
		style:aspect-ratio={primaryAspectRatio}
	>
		{#if initialBlurhash}
			<img
				src={initialBlurhash}
				alt=""
				class="gallery-landing-polaroid__blurhash"
			/>
		{/if}
	</div>
{/if}

<style lang="postcss">
	.gallery-landing-polaroid__skeleton {
		position: relative;
		overflow: hidden;
		width: 100%;
		max-width: min(18rem, 90vw);
		margin: 0 auto;
		background: linear-gradient(90deg, #e8e4dc 0%, #f5f2eb 50%, #e8e4dc 100%);
		background-size: 200% 100%;
		animation: gallery-landing-shimmer 1.2s ease-in-out infinite;
		border-radius: 8px;
		border: 2px solid var(--color-tertiary-lighter, #f0ede3);
	}

	.gallery-landing-polaroid__skeleton--blurhash {
		animation: none;
		background: #dcd8cf;
	}

	.gallery-landing-polaroid__blurhash {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		filter: blur(5px);
		transform: scale(1.02);
		pointer-events: none;
	}

	.gallery-landing-polaroid__error {
		font-family: Garamond, serif;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-align: center;
		padding: 2rem 1rem;
	}

	@keyframes gallery-landing-shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-landing-polaroid__skeleton:not(.gallery-landing-polaroid__skeleton--blurhash) {
			animation: none;
			background: #e8e4dc;
		}
	}
</style>
