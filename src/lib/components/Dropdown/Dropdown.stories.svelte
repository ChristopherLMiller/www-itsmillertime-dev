<script module>
	/* eslint-disable svelte/no-useless-children-snippet -- story must pass both button and panel snippets to Dropdown */
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Dropdown from './Dropdown.svelte';

	const { Story } = defineMeta({
		title: 'Components/Dropdown',
		component: Dropdown,
		tags: ['autodocs']
	});
</script>

<Story name="Default" asChild>
	<Dropdown popoverId="storybook-dropdown">
		{#snippet button()}
			<span>Menu</span>
		{/snippet}
		{#snippet children()}
			<p style="padding: 1rem;">Dropdown panel content</p>
		{/snippet}
	</Dropdown>
</Story>
