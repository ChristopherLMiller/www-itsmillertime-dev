<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NavigationProgress from './NavigationProgress.svelte';

	const { Story } = defineMeta({
		title: 'Components/NavigationProgress',
		component: NavigationProgress,
		tags: ['autodocs']
	});
</script>

<Story name="Default" />
