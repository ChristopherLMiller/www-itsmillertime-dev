<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Folder from './Folder.svelte';

	const { Story } = defineMeta({
		title: 'Components/Folder',
		component: Folder,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ title: 'Open me' }}>
	<p>Folder contents</p>
</Story>
