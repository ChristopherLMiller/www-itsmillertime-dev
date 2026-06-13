<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import VideoPlayer from './VideoPlayer.svelte';

	const { Story } = defineMeta({
		title: 'Components/VideoPlayer',
		component: VideoPlayer,
		tags: ['autodocs']
	});
</script>

<Story
	name="YouTube"
	args={{
		title: 'Embedded video',
		url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
	}}
/>
