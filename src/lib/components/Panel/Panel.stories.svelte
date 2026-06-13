<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Panel from './Panel.svelte';

	const { Story } = defineMeta({
		title: 'Components/Layout/Panel',
		component: Panel,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<p>Panel body</p>
</Story>

<Story name="BorderAndPadding" args={{ hasBorder: true, hasPadding: true }}>
	<p>With border and padding</p>
</Story>
