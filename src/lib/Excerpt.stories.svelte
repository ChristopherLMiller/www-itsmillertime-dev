<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Excerpt from './Excerpt.svelte';
	import { storybookPost } from '../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Content/Excerpt',
		component: Excerpt,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ item: storybookPost }} />
