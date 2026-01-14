<script lang="ts">
	import PolaroidStack from '$lib/components/PolaroidStack.svelte';
	import type { Media } from '$lib/types/payload-types';

	const { data } = $props();

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
</script>

<div class="galleries-grid">
	{#each data.galleries as gallery (gallery.id)}
		{@const galleryDocs = gallery.images?.docs ?? []}
		{@const stackImages = galleryDocs
			.map((doc) => extractMediaFromDoc(doc))
			.filter((media): media is Media => Boolean(media))}
		{@const cover = (gallery.meta?.image as Media | number | null) ?? stackImages[0]}
		{#if cover && typeof cover === 'object' && stackImages.length > 0}
			<a href="/galleries/{gallery.slug}" class="gallery-link">
				<PolaroidStack
					primary={cover}
					images={stackImages}
					caption={gallery.title}
					enableViewTransition={true}
				/>
			</a>
		{/if}
	{/each}
</div>

<style>
	.galleries-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	@media (min-width: 640px) {
		.galleries-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.galleries-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.galleries-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.gallery-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}
</style>