<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GalleryLightboxStoryHost from '../../storybook/GalleryLightboxStoryHost.svelte';
	import { storybookGalleryAlbum, storybookImageMedia } from '../../storybook/fixtures';

	const exifImage = {
		...storybookImageMedia,
		exif: {
			exif: {
				Model: { description: 'Example camera' },
				FNumber: { description: 'f/2.8' },
				ISOSpeedRatings: { description: '400' }
			}
		}
	};

	const { Story } = defineMeta({
		title: 'Components/GalleryLightboxContent',
		component: GalleryLightboxStoryHost,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		gallery: storybookGalleryAlbum,
		image: exifImage,
		index: 0,
		total: 3,
		useProxy: false
	}}
/>
