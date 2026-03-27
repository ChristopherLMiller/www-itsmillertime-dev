<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ShareButtons from './ShareButtons.svelte';

	const { Story } = defineMeta({
		title: 'Components/ShareButtons',
		component: ShareButtons,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		url: 'https://itsmillertime.dev/example',
		title: 'Example',
		description: 'Share this page'
	}}
/>
