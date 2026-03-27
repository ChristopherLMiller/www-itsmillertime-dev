<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NavLink from './NavLink.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/NavLink',
		component: NavLink,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		navItem: {
			title: 'Articles',
			link: '/articles',
			order: 0,
			childNodes: [],
			visibility: 'ALL'
		}
	}}
/>
