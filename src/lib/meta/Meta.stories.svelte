<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Meta from './Meta.svelte';

	const { Story } = defineMeta({
		title: 'Meta/Meta',
		component: Meta,
		tags: ['autodocs']
	});
</script>

<Story name="Default" />
