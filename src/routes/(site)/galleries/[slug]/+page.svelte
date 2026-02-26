<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Polaroid from '$lib/components/Polaroid.svelte';
	import Lightbox from '$lib/components/Lightbox.svelte';
	import type { Media } from '$lib/types/payload-types';

	const { data } = $props();

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	function normalizeMedia(value: unknown): Media | null {
		if (typeof value === 'object' && value !== null && 'id' in value) {
			return value as Media;
		}
		return null;
	}

	function extractMediaFromDoc(doc: unknown): Media | null {
		if (typeof doc !== 'object' || doc === null) return null;

		if ('image' in doc) {
			const candidate = (doc as { image?: unknown }).image;
			return normalizeMedia(candidate ?? null);
		}

		return normalizeMedia(doc);
	}

	const galleryImages = $derived(
		(data.gallery.images?.docs ?? [])
			.map((doc) => extractMediaFromDoc(doc))
			.filter((media): media is Media => Boolean(media))
	);

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
		const media = galleryImages[index];
		if (media?.id != null) {
			const url = new URL(page.url);
			url.searchParams.set('selected', String(media.id));
			goto(url.toString(), { replaceState: true });
		}
	}

	function closeLightbox() {
		const url = new URL(page.url);
		url.searchParams.delete('selected');
		goto(url.toString(), { replaceState: true });
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
</script>

<svelte:head>
	<title>{data.gallery.title} - Gallery</title>
</svelte:head>

<div class="gallery-page">
	<header class="gallery-header">
		<h1>{data.gallery.title}</h1>
		{#if data.gallery.content}
			<div class="gallery-description">
				{data.gallery.content}
			</div>
		{/if}
	</header>

	<div class="gallery-grid">
		{#each galleryImages as media, index (media.id)}
			<button
				class="gallery-grid__item"
				onclick={() => openLightbox(index)}
				aria-label="View {media.alt || media.title || 'image'} in lightbox"
			>
				<Polaroid
					{media}
					caption={media.alt || media.title}
					interactive={false}
					enableViewTransition={true}
				/>
			</button>
		{/each}
	</div>
</div>

<Lightbox
		images={galleryImages}
		initialIndex={lightboxIndex}
		bind:open={lightboxOpen}
		onClose={closeLightbox}
		onIndexChange={updateUrlForIndex}
	/>

<style>
	.gallery-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.gallery-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.gallery-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		color: var(--color-text-primary, #1a1a1a);
	}

	.gallery-description {
		max-width: 600px;
		margin: 0 auto;
		color: var(--color-text-secondary, #666);
		line-height: 1.6;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		.gallery-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.gallery-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.gallery-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.gallery-grid__item {
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: transform 250ms ease;
	}

	.gallery-grid__item :global(.polaroid) {
		width: 100%;
		transform: rotate(0deg) !important;
		cursor: pointer;
	}

	/* Slightly rotate polaroids for variety */
	.gallery-grid__item:nth-child(3n + 1) :global(.polaroid) {
		transform: rotate(-1.5deg) !important;
	}

	.gallery-grid__item:nth-child(3n + 2) :global(.polaroid) {
		transform: rotate(1deg) !important;
	}

	.gallery-grid__item:nth-child(3n + 3) :global(.polaroid) {
		transform: rotate(-0.5deg) !important;
	}

	.gallery-grid__item:hover :global(.polaroid),
	.gallery-grid__item:focus-visible :global(.polaroid) {
		transform: rotate(0deg) scale(1.02) !important;
		z-index: 10;
	}

	.gallery-grid__item:focus-visible {
		outline: 2px solid var(--color-accent, #3b82f6);
		outline-offset: 4px;
		border-radius: 8px;
	}
</style>
