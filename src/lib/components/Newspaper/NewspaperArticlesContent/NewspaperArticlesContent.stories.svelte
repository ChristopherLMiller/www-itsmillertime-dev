<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NewspaperArticlesContent from './NewspaperArticlesContent.svelte';
	import { storybookNewspaperPosts } from '../../../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Newspaper/NewspaperArticlesContent',
		component: NewspaperArticlesContent,
		tags: ['autodocs']
	});
</script>

<Story name="Grid" args={{ articles: storybookNewspaperPosts }} />

<Story name="Empty" args={{ articles: null }} />
