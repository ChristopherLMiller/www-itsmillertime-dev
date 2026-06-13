<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Icon from './Icon.svelte';

	const { Story } = defineMeta({
		title: 'Components/Icon',
		component: Icon,
		tags: ['autodocs'],
		argTypes: {
			name: { control: 'select' }
		}
	});
</script>

<Story name="Default" args={{ name: 'calendar', size: 24 }} />

<Story name="GitHub" args={{ name: 'github', size: 32 }} />
