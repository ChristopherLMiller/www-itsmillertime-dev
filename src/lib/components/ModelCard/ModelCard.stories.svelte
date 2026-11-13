<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ModelCard from './ModelCard.svelte';
	import { storybookModel } from '../../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/ModelCard',
		component: ModelCard,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ model: storybookModel }} />

<Story
	name="No tracked time"
	args={{ model: { ...storybookModel, timeTracking: { totalSeconds: null } } }}
/>
