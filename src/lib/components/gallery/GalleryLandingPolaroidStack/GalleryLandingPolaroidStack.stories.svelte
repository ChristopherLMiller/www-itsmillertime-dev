<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GalleryLandingPolaroidStack from './GalleryLandingPolaroidStack.svelte';
	import { storybookImageMedia } from '../../../../storybook/fixtures';

	const nsfw = new Set<number>();

	const { Story } = defineMeta({
		title: 'Components/Gallery/GalleryLandingPolaroidStack',
		component: GalleryLandingPolaroidStack,
		tags: ['autodocs'],
		args: {
			galleryImageId: 1,
			albumId: 1,
			caption: 'Sample album',
			albumDescription: 'Description for Storybook',
			useProxy: false,
			isNsfw: false,
			extraImages: [storybookImageMedia],
			nsfwImageIds: nsfw,
			onNavigate: () => {}
		}
	});
</script>

<!--
  In the browser story, the component fetches /api/gallery/images/:id.
  Without a running API you will see the error state — that is expected here.
-->
<Story name="Default" />
