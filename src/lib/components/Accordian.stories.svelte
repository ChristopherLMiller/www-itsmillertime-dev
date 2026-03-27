<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Accordian from './Accordian.svelte';

	const { Story } = defineMeta({
		title: 'Components/Accordian',
		component: Accordian,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ summary: 'Click to expand' }}>
	<p>Hidden content goes here.</p>
</Story>
