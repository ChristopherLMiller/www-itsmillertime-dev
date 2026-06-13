<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GrungeOverlay from './GrungeOverlay.svelte';

	const { Story } = defineMeta({
		title: 'Components/GrungeOverlay',
		component: GrungeOverlay,
		tags: ['autodocs']
	});
</script>

<Story name="Dark">
	<div style:min-height="240px" style:background="#1a1a1a" style:position="relative">
		<GrungeOverlay mode="dark" opacity={0.85} scale={0.5} speed={0.4} />
	</div>
</Story>

<Story name="Light">
	<div style:min-height="240px" style:background="#f0f0f0" style:position="relative">
		<GrungeOverlay mode="light" opacity={0.7} scale={0.45} speed={0.35} />
	</div>
</Story>
