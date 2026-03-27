<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Polaroid from './Polaroid.svelte';
	import { storybookImageMedia } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Polaroid',
		component: Polaroid,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ media: storybookImageMedia, caption: 'Sample caption' }} />
