<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TopBar from './TopBar.svelte';

	const { Story } = defineMeta({
		title: 'Components/Layout/TopBar',
		component: TopBar,
		tags: ['autodocs']
	});
</script>

<Story name="Default" />
