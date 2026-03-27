<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GalleryMediaPlayer from './GalleryMediaPlayer.svelte';
	import { storybookYouTubeMedia } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/GalleryMediaPlayer',
		component: GalleryMediaPlayer,
		tags: ['autodocs']
	});
</script>

<Story name="YouTube" args={{ media: storybookYouTubeMedia }} />
