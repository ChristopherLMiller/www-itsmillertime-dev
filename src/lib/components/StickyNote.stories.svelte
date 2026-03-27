<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StickyNote from './StickyNote.svelte';

	const { Story } = defineMeta({
		title: 'Components/StickyNote',
		component: StickyNote,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ title: 'Note' }}>
	<p>Remember to water the plants.</p>
</Story>
