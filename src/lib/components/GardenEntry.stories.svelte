<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GardenEntry from './GardenEntry.svelte';
	import { storybookGarden } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/GardenEntry',
		component: GardenEntry,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ garden: storybookGarden, titleHref: '/garden/sample' }} />
