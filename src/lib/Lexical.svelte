<!-- LexicalRenderer.svelte -->
<script lang="ts">
	import NodeRenderer from '$lib/NodeRenderer.svelte';
	import type { LexicalEditorState, LexicalNode } from '$lib/lexicalTypes';

	let { data }: { data: LexicalEditorState | null | undefined } = $props();

	function processNode(
		node: LexicalNode
	): (LexicalNode & { processedChildren: LexicalNode[] }) | null {
		if (!node || !node.type) return null;

		const children = node.children;
		return {
			...node,
			processedChildren: children
				? (children.map((child) => processNode(child)).filter(Boolean) as LexicalNode[])
				: []
		};
	}

	let processedData = $derived(
		data?.root?.children
			? data.root.children.map((child: LexicalNode) => processNode(child)).filter(Boolean)
			: []
	);
</script>

<div>
	{#each processedData as node, i (i)}
		<NodeRenderer {node} />
	{/each}
</div>

<style lang="postcss">
	div :global(ul.check-list) {
		list-style: none;
		padding-left: 0;
		margin-left: 0;
	}

	:global(p) {
		line-height: 1.6;
		margin-block-end: 1rem;
	}
</style>
