<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Paginator from './Paginator.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Paginator',
		component: Paginator,
		tags: ['autodocs']
	});
</script>

<Story
	name="MiddlePage"
	args={{
		meta: {
			hasPrevPage: true,
			hasNextPage: true,
			prevPage: 2,
			nextPage: 4,
			totalPages: 10
		}
	}}
/>
