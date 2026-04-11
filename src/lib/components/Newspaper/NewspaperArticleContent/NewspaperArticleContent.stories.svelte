<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NewspaperArticleContent from './NewspaperArticleContent.svelte';
	import { storybookPost } from '../../../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Newspaper/NewspaperArticleContent',
		component: NewspaperArticleContent,
		tags: ['autodocs']
	});
</script>

<Story name="Default" args={{ article: storybookPost }} />
