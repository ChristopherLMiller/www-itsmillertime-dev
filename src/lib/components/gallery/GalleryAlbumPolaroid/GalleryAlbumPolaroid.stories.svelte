<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GalleryAlbumPolaroid from './GalleryAlbumPolaroid.svelte';
	import { storybookImageMedia } from '../../../../storybook/fixtures';
	import type { GalleryGridMedia } from '$lib/utils/gallery-image-display';

	const cachedMedia: GalleryGridMedia = {
		...storybookImageMedia,
		isNsfw: false,
		galleryImageId: 1
	};

	const { Story } = defineMeta({
		title: 'Components/Gallery/GalleryAlbumPolaroid',
		component: GalleryAlbumPolaroid,
		tags: ['autodocs'],
		args: {
			galleryImageId: 1,
			cachedMedia,
			albumIsNsfw: false,
			useProxy: false
		}
	});
</script>

<Story name="CachedMedia" />
