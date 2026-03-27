<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NavButton from './NavButton.svelte';

	const { Story } = defineMeta({
		title: 'Navigation/NavButton',
		component: NavButton,
		tags: ['autodocs']
	});
</script>

<Story
	name="WithChildren"
	args={{
		navItem: {
			title: 'Explore',
			link: '#',
			path: '/explore',
			order: 0,
			childNodes: [
				{
					title: 'Child',
					link: '/child',
					order: 0,
					visibility: 'ALL'
				}
			],
			visibility: 'ALL'
		}
	}}
/>
