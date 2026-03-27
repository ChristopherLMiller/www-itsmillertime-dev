<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PolaroidStack from './PolaroidStack.svelte';
	import { storybookImageMedia } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/PolaroidStack',
		component: PolaroidStack,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		primary: storybookImageMedia,
		images: [storybookImageMedia],
		caption: 'Stack preview'
	}}
/>
