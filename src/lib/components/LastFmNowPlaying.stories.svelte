<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LastFmStoryWrapper from '../../storybook/LastFmStoryWrapper.svelte';

	const { Story } = defineMeta({
		title: 'Components/LastFmNowPlaying',
		component: LastFmStoryWrapper,
		tags: ['autodocs']
	});
</script>

<Story name="MockedApi" />
