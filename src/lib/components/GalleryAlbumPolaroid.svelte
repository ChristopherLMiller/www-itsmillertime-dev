<script lang="ts">
	import { browser } from '$app/environment';
	import Polaroid from '$lib/components/Polaroid.svelte';
	import {
		buildPlaceholderGalleryMedia,
		galleryImageDocToDisplayMedia,
		type GalleryGridMedia
	} from '$lib/utils/gallery-image-display';
	import { lexicalToPlainText } from '$lib/utils/lexical-to-text';

	type GalleryAlbumPolaroidProps = {
		galleryImageId: number;
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
	};

	const {
		galleryImageId,
		layoutWidth,
		layoutHeight,
		layoutAspectRatio = 3 / 4,
		initialBlurhash = null,
		albumIsNsfw,
		useProxy,
		priority = false,
		onResolved,
		onFetchEnd,
		onClick
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
{:else}
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
		{#key `${displayMedia.id}-${displayMedia.url ?? ''}`}
			<Polaroid
				media={displayMedia}
				caption={displayMedia.caption ? (lexicalToPlainText(displayMedia.caption).trim() || undefined) : undefined}
				interactive={false}
				clickable={false}
				enableViewTransition={false}
				adaptiveHeight={true}
				{useProxy}
				isNsfw={displayMedia.isNsfw}
				{priority}
			/>
		{/key}
	</button>
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

	.gallery-album-polaroid__hit--pending {
		cursor: wait;
		pointer-events: none;
	}

	.gallery-album-polaroid__error {
		font-family: var(--font-roboto, sans-serif);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-align: center;
		padding: 2rem 0.5rem;
	}

</style>
