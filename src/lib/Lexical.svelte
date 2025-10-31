<!-- LexicalRenderer.svelte -->
<script>
	import NodeRenderer from '$lib/NodeRenderer.svelte';
	// We'll create this component

	/**
	 * @typedef {Object} TextNode
	 * @property {'text'} type
	 * @property {string} text
	 * @property {number} [format]
	 */

	/**
	 * @typedef {Object} ImageNode
	 * @property {'image'} type
	 * @property {string} [src]
	 * @property {string} [alt]
	 * @property {string} [altText]
	 * @property {number} [width]
	 * @property {number} [height]
	 * @property {string} [caption]
	 */

	/**
	 * @typedef {Object} UploadNode
	 * @property {'upload'} type
	 * @property {Object} value
	 * @property {string} [value.url]
	 * @property {string} [value.alt]
	 * @property {number} [value.width]
	 */

	/**
	 * @typedef {Object} LinkNode
	 * @property {'link'|'autolink'} type
	 * @property {string} [url]
	 * @property {string} [target]
	 * @property {string} [rel]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} ParagraphNode
	 * @property {'paragraph'} type
	 * @property {string} [format]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} HeadingNode
	 * @property {'heading'} type
	 * @property {string} [tag]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} ListNode
	 * @property {'list'} type
	 * @property {string} [listType]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} ListItemNode
	 * @property {'listitem'} type
	 * @property {boolean} [checked]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} QuoteNode
	 * @property {'quote'} type
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} CodeNode
	 * @property {'code'} type
	 * @property {string} [language]
	 * @property {string} [text]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} TableNode
	 * @property {'table'} type
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} TableRowNode
	 * @property {'tablerow'} type
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} TableCellNode
	 * @property {'tablecell'} type
	 * @property {boolean} [headerState]
	 * @property {number} [colspan]
	 * @property {number} [rowspan]
	 * @property {LexicalNode[]} [children]
	 */

	/**
	 * @typedef {Object} HorizontalRuleNode
	 * @property {'horizontalrule'} type
	 */

	/**
	 * @typedef {Object} LineBreakNode
	 * @property {'linebreak'} type
	 */

	/**
	 * @typedef {TextNode|ImageNode|UploadNode|LinkNode|ParagraphNode|HeadingNode|ListNode|ListItemNode|QuoteNode|CodeNode|TableNode|TableRowNode|TableCellNode|HorizontalRuleNode|LineBreakNode} LexicalNode
	 */

	/**
	 * @typedef {Object} EditorState
	 * @property {Object} root
	 * @property {LexicalNode[]} root.children
	 */

	/** @type {{ data: EditorState }} */
	let { data } = $props();

	/**
	 * Process node and its children recursively
	 * @param {LexicalNode} node - Node to process
	 * @returns {LexicalNode & { processedChildren: LexicalNode[] } | null}
	 */
	function processNode(node) {
		if (!node || !node.type) return null;

		return {
			...node,
			processedChildren: node.children
				? node.children.map((child) => processNode(child)).filter(Boolean)
				: []
		};
	}

	// Process the entire editor state
	let processedData = $derived(
		data && data.root && data.root.children
			? data.root.children.map((child) => processNode(child)).filter(Boolean)
			: []
	);
</script>

<div>
	{#each processedData as node}
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
