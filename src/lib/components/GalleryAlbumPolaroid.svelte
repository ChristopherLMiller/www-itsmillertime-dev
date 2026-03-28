<script lang="ts">
	import { browser } from '$app/environment';
	import Polaroid from '$lib/components/Polaroid.svelte';
	import { galleryImageDocToDisplayMedia, type GalleryGridMedia } from '$lib/utils/gallery-image-display';
	import { lexicalToPlainText } from '$lib/utils/lexical-to-text';

	type GalleryAlbumPolaroidProps = {
		galleryImageId: number;
		albumIsNsfw: boolean;
		useProxy: boolean;
		priority?: boolean;
		onResolved?: (media: GalleryGridMedia) => void;
		/** Called after the preview request finishes (success or failure). */
		onFetchEnd?: () => void;
		onClick?: (media: GalleryGridMedia) => void;
	};

	const {
		galleryImageId,
		albumIsNsfw,
		useProxy,
		priority = false,
		onResolved,
		onFetchEnd,
		onClick
	}: GalleryAlbumPolaroidProps = $props();

	let media = $state<GalleryGridMedia | null>(null);
	let loadError = $state<string | null>(null);

	$effect(() => {
		if (!browser) return;

		const id = galleryImageId;
		let cancelled = false;
		const ac = new AbortController();

		media = null;
		loadError = null;

		(async () => {
			try {
				const res = await fetch(`/api/gallery-image-preview/${id}?full=1`, { signal: ac.signal });
				if (!res.ok) {
					if (!cancelled) loadError = res.status === 404 ? 'Image unavailable' : 'Could not load image';
					return;
				}
				const doc: unknown = await res.json();
				if (cancelled) return;
				const m = galleryImageDocToDisplayMedia(doc, albumIsNsfw);
				if (m) {
					media = m;
					onResolved?.(m);
				} else if (!cancelled) {
					loadError = 'Invalid image data';
				}
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				if (!cancelled) loadError = 'Could not load image';
			} finally {
				if (!cancelled) onFetchEnd?.();
			}
		})();

		return () => {
			cancelled = true;
			ac.abort();
		};
	});
</script>

{#if loadError}
	<div class="gallery-album-polaroid__error" role="status">{loadError}</div>
{:else if media}
	<button
		type="button"
		class="gallery-album-polaroid__hit"
		onclick={() => onClick?.(media!)}
		aria-label="View {media.alt || 'image'} in lightbox"
	>
		<Polaroid
			{media}
			caption={media.caption ? (lexicalToPlainText(media.caption).trim() || undefined) : undefined}
			interactive={false}
			clickable={false}
			enableViewTransition={false}
			adaptiveHeight={true}
			{useProxy}
			isNsfw={media.isNsfw}
			{priority}
		/>
	</button>
{:else}
	<div class="gallery-album-polaroid__skeleton" aria-hidden="true"></div>
{/if}

<style lang="postcss">
	.gallery-album-polaroid__hit {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.gallery-album-polaroid__skeleton {
		aspect-ratio: 3 / 4;
		width: 100%;
		background: linear-gradient(90deg, #e8e4dc 0%, #f5f2eb 50%, #e8e4dc 100%);
		background-size: 200% 100%;
		animation: gallery-album-shimmer 1.2s ease-in-out infinite;
		border-radius: 8px;
		border: 2px solid var(--color-tertiary-lighter, #f0ede3);
	}

	.gallery-album-polaroid__error {
		font-family: var(--font-roboto, sans-serif);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-align: center;
		padding: 2rem 0.5rem;
	}

	@keyframes gallery-album-shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-album-polaroid__skeleton {
			animation: none;
			background: #e8e4dc;
		}
	}
</style>
