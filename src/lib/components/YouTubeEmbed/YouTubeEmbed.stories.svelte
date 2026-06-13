<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import YouTubeEmbed from './YouTubeEmbed.svelte';

	const { Story } = defineMeta({
		title: 'Components/YouTubeEmbed',
		component: YouTubeEmbed,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		title: 'Example video',
		url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
	}}
/>
