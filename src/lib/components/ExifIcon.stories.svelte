<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ExifIcon from './ExifIcon.svelte';

	const { Story } = defineMeta({
		title: 'Components/ExifIcon',
		component: ExifIcon,
		tags: ['autodocs']
	});
</script>

<Story name="Camera" args={{ icon: 'camera' }} />

<Story name="Aperture" args={{ icon: 'aperture' }} />
