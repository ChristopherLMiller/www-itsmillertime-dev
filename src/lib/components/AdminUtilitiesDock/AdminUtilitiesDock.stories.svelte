<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminUtilitiesDock from './AdminUtilitiesDock.svelte';

	const { Story } = defineMeta({
		title: 'Components/AdminUtilitiesDock',
		component: AdminUtilitiesDock,
		tags: ['autodocs']
	});
</script>

<!-- Renders nothing unless the current user has the admin role (session from layout). -->
<Story name="Default" />
