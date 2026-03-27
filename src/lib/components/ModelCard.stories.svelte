<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ModelCardStoryWrapper from '../../storybook/ModelCardStoryWrapper.svelte';
	import { storybookModel } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/ModelCard',
		component: ModelCardStoryWrapper,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ model: storybookModel }} />
