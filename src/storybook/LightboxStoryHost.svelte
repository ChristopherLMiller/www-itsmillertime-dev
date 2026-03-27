<script lang="ts">
	import Lightbox from '$lib/components/Lightbox.svelte';
	import type { Media } from '$lib/types/payload-types';

	let {
		images,
		initialIndex = 0
	}: {
		images: (Media & { galleryImageId?: number })[];
		initialIndex?: number;
	} = $props();

	let open = $state(true);
</script>

<Lightbox {images} {initialIndex} bind:open />
