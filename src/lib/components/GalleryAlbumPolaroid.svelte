<script lang="ts">
	import { browser } from '$app/environment';
	import Polaroid from '$lib/components/Polaroid.svelte';
	import { buildPlaceholderGalleryMedia, type GalleryGridMedia } from '$lib/utils/gallery-image-display';
	import { fetchGalleryImageFullForPolaroid } from '$lib/utils/gallery-image-full-fetch';
	import { lexicalToPlainText } from '$lib/utils/lexical-to-text';

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
		const fromParent = cachedMedia;

		if (fromParent != null && fromParent.galleryImageId === id) {
			media = fromParent;
			loadError = null;
			queueMicrotask(() => onFetchEnd?.());
			return;
		}

		// Do not AbortController + cleanup: parent re-renders (e.g. slotMedia updates) were
		// aborting in-flight work and causing canceled storms. Dedupe is in fetchGalleryImageFullForPolaroid.
		let stale = false;
		media = null;
		loadError = null;

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
