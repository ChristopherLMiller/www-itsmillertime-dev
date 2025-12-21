<script lang="ts">
	import PolaroidStack from '$lib/components/PolaroidStack.svelte';
	import StickyNote from '$lib/components/StickyNote.svelte';
	import Panel from '$lib/Panel.svelte';
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

<Panel hasBorder hasPadding>
	<h1>Gallery</h1>
	<p>Coming soon...</p>
</Panel>

<StickyNote>
	<p><strong>Reminder:</strong> Don't forget to check out these amazing galleries!</p>
	<p>Each one tells a unique story through beautiful imagery.</p>
	<p>Click on any polaroid stack to explore more...</p>
</StickyNote>

{#each data.galleries as gallery (gallery.id)}
	{@const cover = gallery.meta?.image as Media | number | null}
	{@const galleryDocs = gallery.images?.docs ?? []}
	{@const stackImages = galleryDocs
		.map((doc) => extractMediaFromDoc(doc))
		.filter((media): media is Media => Boolean(media))}
	{#if cover && typeof cover === 'object'}
		<PolaroidStack primary={cover} images={stackImages} caption={gallery.title} />
	{/if}
{/each}