<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Masonry from 'svelte-bricks';
	import Panel from '$lib/Panel.svelte';
	import GalleryAlbumHeader from '$lib/components/GalleryAlbumHeader.svelte';
	import Polaroid from '$lib/components/Polaroid.svelte';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import GalleryLightboxContent from '$lib/components/GalleryLightboxContent.svelte';
	import { lexicalToPlainText } from '$lib/utils/lexical-to-text';
	import type { Media, GalleryImage } from '$lib/types/payload-types';

	type GalleryMedia = Media & { isNsfw: boolean };

	const { data } = $props();

	const isRestricted = $derived(
		data.gallery.settings?.isNsfw === true ||
		data.gallery.settings?.visibility !== 'ALL'
	);
	const useProxy = $derived(isRestricted);
	const albumIsNsfw = $derived(data.gallery.settings?.isNsfw === true);
	const nsfwPref = $derived((page.data.session?.user?.nsfwFiltering ?? '').toLowerCase());
	const shouldHideAlbum = $derived(albumIsNsfw && nsfwPref === 'hide');

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	function extractGalleryMedia(doc: unknown): (GalleryMedia & { galleryImageId?: number }) | null {
		if (typeof doc !== 'object' || doc === null) return null;

		const imageDoc = doc as Partial<GalleryImage>;
		const docIsNsfw = imageDoc.settings?.isNsfw === true || albumIsNsfw;
		const galleryImageId = imageDoc.id;

		if ('url' in imageDoc && 'id' in imageDoc) {
			return { ...(imageDoc as Media), isNsfw: docIsNsfw, galleryImageId };
		}

		if ('image' in imageDoc) {
			const candidate = (imageDoc as { image?: unknown }).image;
			if (typeof candidate === 'object' && candidate !== null && 'id' in candidate) {
				return { ...(candidate as Media), isNsfw: docIsNsfw, galleryImageId };
			}
		}

		return null;
	}

	const allGalleryImages = $derived(
		(data.gallery.images?.docs ?? [])
			.map((doc) => extractGalleryMedia(doc))
			.filter((media): media is GalleryMedia & { galleryImageId?: number } => Boolean(media))
	);

	const galleryImages = $derived(
		nsfwPref === 'hide'
			? allGalleryImages.filter((m) => !m.isNsfw)
			: allGalleryImages
	);

	function openLightboxForItem(item: GalleryMedia) {
		const idx = galleryImages.findIndex((m) => m.id === item.id);
		if (idx === -1) return;
		lightboxIndex = idx;
		lightboxOpen = true;
		const url = new URL(window.location.href);
		url.searchParams.set('selected', String(item.id));
		window.history.replaceState(null, '', url.toString());
	}

	function closeLightbox() {
		const url = new URL(window.location.href);
		url.searchParams.delete('selected');
		window.history.replaceState(null, '', url.toString());
	}

	function updateUrlForIndex(index: number) {
		const media = galleryImages[index];
		if (media?.id != null && typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('selected', String(media.id));
			window.history.replaceState(null, '', url.toString());
		}
	}

	// Open lightbox on load when ?selected=<imageId> is present
	$effect(() => {
		const selected = page.url.searchParams.get('selected');
		if (!selected || galleryImages.length === 0) return;
		const id = parseInt(selected, 10);
		if (Number.isNaN(id)) return;
		const idx = galleryImages.findIndex((m) => m.id === id);
		if (idx === -1) return;
		lightboxIndex = idx;
		lightboxOpen = true;
	});

	// Refresh data when returning to the tab (e.g. after uploading elsewhere)
	$effect(() => {
		if (!browser) return;
		const handler = () => {
			if (document.visibilityState === 'visible') invalidateAll();
		};
		document.addEventListener('visibilitychange', handler);
		return () => document.removeEventListener('visibilitychange', handler);
	});
</script>

{#if shouldHideAlbum}
	<div class="gallery-page">
		<div class="gallery-header-wrap">
			<Panel hasBorder hasPadding>
				<header class="gallery-header">
					<h1>{data.gallery.title}</h1>
					<p class="gallery-hidden-notice">This album contains NSFW content and is hidden by your profile settings.</p>
				</header>
			</Panel>
		</div>
	</div>
{:else}
	<div class="gallery-page">
		<GalleryAlbumHeader gallery={data.gallery} imageCount={galleryImages.length} />

		<div class="gallery-grid">
			<Masonry
				items={galleryImages}
				idKey="id"
				minColWidth={400}
				maxColWidth={600}
				gap={30}
				animate={false}
			>
				{#snippet children({ item })}
				{@const idx = galleryImages.findIndex((g) => g.id === item.id)}
				{@const rotation = ((((item.id * 2654435761 + 1013904223) % 2147483647) / 2147483647) * 14 - 7).toFixed(1)}
					<button
						class="gallery-grid__item"
						style:--rotation="{rotation}deg"
						onclick={() => openLightboxForItem(item)}
						aria-label="View {item.alt || 'image'} in lightbox"
					>
						<Polaroid
							media={item}
							caption={item.caption ? (lexicalToPlainText(item.caption).trim() || undefined) : undefined}
							interactive={false}
							clickable={true}
							enableViewTransition={false}
							adaptiveHeight={true}
							{useProxy}
							isNsfw={item.isNsfw}
							priority={idx >= 0 && idx < 6}
						/>
					</button>
				{/snippet}
			</Masonry>
		</div>
	</div>

	<Lightbox
			images={galleryImages}
			initialIndex={lightboxIndex}
			bind:open={lightboxOpen}
			onClose={closeLightbox}
			onIndexChange={updateUrlForIndex}
			{useProxy}
		>
			{#snippet content({ image, index, total, imageSrc, isLoaded, placeholderSrc, onImageLoad, onClose, onPrevious, onNext, hasPrevious, hasNext, galleryImageId, useProxy })}
				<GalleryLightboxContent
					{image}
					{index}
					{total}
					{imageSrc}
					{isLoaded}
					{placeholderSrc}
					{onImageLoad}
					{onClose}
					{onPrevious}
					{onNext}
					{hasPrevious}
					{hasNext}
					gallery={data.gallery}
					{galleryImageId}
					{useProxy}
				/>
			{/snippet}
		</Lightbox>
{/if}

<style>
	.gallery-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.gallery-header {
		text-align: center;
		margin-bottom: 0;
	}

	.gallery-header-wrap {
		margin-bottom: 3rem;
	}

	.gallery-header h1 {
		font-size: var(--fs-m);
		font-weight: 700;
		margin-bottom: 0.75rem;
		color: var(--color-primary-darkest);
		font-family: var(--font-oswald);
	}

	.gallery-hidden-notice {
		color: var(--color-tertiary);
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
	}

	.gallery-grid__item {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform 250ms ease;
	}

	.gallery-grid__item :global(.polaroid) {
		width: 100%;
		transform: rotate(var(--rotation, 0deg));
		cursor: pointer;
		transition: transform 250ms ease, box-shadow 250ms ease;
	}

	.gallery-grid__item:hover :global(.polaroid),
	.gallery-grid__item:focus-visible :global(.polaroid) {
		transform: rotate(0deg) scale(1.15);
		box-shadow: 0 1.5rem 3rem -0.5rem rgba(0, 0, 0, 0.45), 0 0.75rem 1.5rem -0.25rem rgba(0, 0, 0, 0.3);
		z-index: 10;
	}

	.gallery-grid__item:focus-visible {
		outline: none;
	}
</style>
