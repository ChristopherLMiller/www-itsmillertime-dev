<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Image from './Image.svelte';
	import { storybookImageMedia } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Image',
		component: Image,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ image: storybookImageMedia, hasBorder: true }} />
