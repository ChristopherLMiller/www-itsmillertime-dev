<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LightboxStoryHost from '../../storybook/LightboxStoryHost.svelte';
	import { storybookImageMedia } from '../../storybook/fixtures';

	const { Story } = defineMeta({
		title: 'Components/Lightbox',
		component: LightboxStoryHost,
		tags: ['autodocs']
	});
</script>

<Story name="Open" args={{ images: [storybookImageMedia], initialIndex: 0 }} />
