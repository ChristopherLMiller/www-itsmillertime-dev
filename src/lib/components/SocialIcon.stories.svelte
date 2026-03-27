<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SocialIcon from './SocialIcon.svelte';

	const { Story } = defineMeta({
		title: 'Components/SocialIcon',
		component: SocialIcon,
		tags: ['autodocs']
	});
</script>

<Story name="Twitter" args={{ platform: 'twitter', size: 32 }} />

<Story name="Facebook" args={{ platform: 'facebook', size: 32 }} />
