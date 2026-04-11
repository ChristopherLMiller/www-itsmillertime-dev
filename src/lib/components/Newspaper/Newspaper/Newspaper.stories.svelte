<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Newspaper from './Newspaper.svelte';
	import {
		storybookNewspaperPosts,
		storybookPostsCategory,
		storybookPostsTag
	} from '../../../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Newspaper/Newspaper',
		component: Newspaper,
		tags: ['autodocs']
	});
</script>

<Story
	name="Listing"
	args={{
		title: 'From My Desk',
		subtitle: 'A collection of my thoughts and ideas',
		categories: [storybookPostsCategory],
		selectedCategory: '',
		tags: [storybookPostsTag],
		selectedTag: '',
		articles: storybookNewspaperPosts,
		pagination: { page: 1, totalPages: 3, totalDocs: 36, limit: 12 }
	}}
/>
