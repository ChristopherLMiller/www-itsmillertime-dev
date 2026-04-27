<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FilmStrip from './FilmStrip.svelte';

	const categories = [
		{ id: 1, slug: 'travel', title: 'Travel' },
		{ id: 2, slug: 'food', title: 'Food' }
	];

	function getHref(slug: string) {
		return `/galleries?category=${slug}`;
	}

	const { Story } = defineMeta({
		title: 'Components/FilmStrip',
		component: FilmStrip,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ categories, selectedSlug: 'travel', getHref }} />
