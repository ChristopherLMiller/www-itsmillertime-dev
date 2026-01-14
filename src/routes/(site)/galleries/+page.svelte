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

<style>
	.gallery-link {
		display: inline-block;
		text-decoration: none;
		color: inherit;
	}
</style>