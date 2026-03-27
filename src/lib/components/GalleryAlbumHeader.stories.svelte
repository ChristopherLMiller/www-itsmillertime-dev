<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GalleryAlbumHeader from './GalleryAlbumHeader.svelte';
	import { storybookGalleryAlbum } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/GalleryAlbumHeader',
		component: GalleryAlbumHeader,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ gallery: storybookGalleryAlbum, imageCount: 12 }} />
