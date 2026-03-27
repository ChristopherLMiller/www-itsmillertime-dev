<script lang="ts">
	import GalleryLightboxContent from '$lib/components/GalleryLightboxContent.svelte';
	import { getMediaUrl } from '$lib/utils/media-url';
	import type { GalleryAlbum, Media } from '$lib/types/payload-types';
	import { fn } from 'storybook/test';

	let {
		gallery,
		image = undefined,
		index = 0,
		total = 1,
		useProxy = false
	}: {
		gallery: GalleryAlbum;
		image?: Media;
		index?: number;
		total?: number;
		useProxy?: boolean;
	} = $props();

	const imageSrc = $derived(image?.url ? getMediaUrl(image.url, useProxy) : null);
</script>

<GalleryLightboxContent
	{gallery}
	{image}
	{index}
	{total}
	{imageSrc}
	isLoaded={true}
	placeholderSrc={null}
	onImageLoad={fn()}
	onClose={fn()}
	onPrevious={fn()}
	onNext={fn()}
	hasPrevious={false}
	hasNext={false}
	{useProxy}
/>
