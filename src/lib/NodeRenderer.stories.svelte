<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import NodeRenderer from './NodeRenderer.svelte';

	const { Story } = defineMeta({
		title: 'Content/NodeRenderer',
		component: NodeRenderer,
		tags: ['autodocs']
	});

	const paragraphNode = {
		type: 'paragraph',
		processedChildren: [{ type: 'text', text: 'Rendered via NodeRenderer.', format: 0 }]
	};
</script>

<Story name="Paragraph" args={{ node: paragraphNode }} />
