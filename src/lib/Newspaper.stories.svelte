<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Newspaper from './Newspaper.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Newspaper',
		component: Newspaper,
		tags: ['autodocs']
	});
</script>

<Story name="Default" asChild>
	<Newspaper heading="Weekly digest" subheading="March 2024">
		{#snippet children()}
			<p>This is the main column of the newspaper layout.</p>
		{/snippet}
	</Newspaper>
</Story>
