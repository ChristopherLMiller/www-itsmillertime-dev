<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Disqus from './Disqus.svelte';

	const { Story } = defineMeta({
		title: 'Components/Disqus',
		component: Disqus,
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	args={{
		identifier: 'storybook-disqus',
		title: 'Storybook page',
		url: 'https://itsmillertime.dev/storybook'
	}}
/>
