<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LoadingIndicator from './LoadingIndicator.svelte';

	const { Story } = defineMeta({
		title: 'Components/LoadingIndicator',
		component: LoadingIndicator,
		tags: ['autodocs']
	});
</script>

<Story name="Dots" args={{ variant: 'dots', text: 'Loading…' }} />

<Story name="Spinner" args={{ variant: 'spinner', size: 'large' }} />
