<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NewspaperLayout from './NewspaperLayout.svelte';
	import { storybookPostsCategory, storybookPostsTag } from '../../../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Newspaper/NewspaperLayout',
		component: NewspaperLayout,
		tags: ['autodocs']
	});
</script>

<Story
	name="WithFilters"
	args={{
		title: 'From My Desk',
		subtitle: 'A collection of my thoughts and ideas',
		categories: [storybookPostsCategory],
		selectedCategory: '',
		tags: [storybookPostsTag],
		selectedTag: '',
		pagination: { page: 1, totalPages: 2, totalDocs: 12, limit: 12 },
		showFilters: true,
		subtitleTransitionName: 'newspaper-subtitle'
	}}
>
	<p style="font-family: 'Times New Roman', Times, serif; color: #333;">
		Main column placeholder — article index or body renders here.
	</p>
</Story>

<Story
	name="ArticleShell"
	args={{
		title: 'From My Desk',
		subtitle: 'A collection of my thoughts and ideas',
		categories: [],
		selectedCategory: '',
		tags: [],
		selectedTag: '',
		pagination: null,
		showFilters: false,
		mastheadTitleTag: 'p',
		subtitleTransitionName: 'newspaper-subtitle'
	}}
>
	<p style="font-family: 'Times New Roman', Times, serif; color: #333;">
		Single-article layout: filters hidden, masthead title as paragraph when needed.
	</p>
</Story>
