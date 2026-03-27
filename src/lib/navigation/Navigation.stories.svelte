<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Navigation from './Navigation.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/Navigation',
		component: Navigation,
		tags: ['autodocs']
	});
</script>

<Story name="Default" />
