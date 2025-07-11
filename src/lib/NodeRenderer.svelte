<!-- NodeRenderer.svelte -->
<script>
	import Image from '$lib/Image.svelte';
	import NodeRenderer from '$lib/NodeRenderer.svelte';

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

	/** @type {{ node: LexicalNode & { processedChildren?: LexicalNode[] } }} */
	let { node } = $props();

	// Text format constants
	const TEXT_TYPE_TO_FORMAT = {
		bold: 1,
		italic: 2,
		strikethrough: 4,
		underline: 8,
		code: 16,
		subscript: 32,
		superscript: 64,
		highlight: 128
	};

	/**
	 * Check if text has specific formatting
	 * @param {number} format - Format bitmask
	 * @param {keyof typeof TEXT_TYPE_TO_FORMAT} type - Format type
	 * @returns {boolean}
	 */
	function hasFormat(format, type) {
		return (format & TEXT_TYPE_TO_FORMAT[type]) !== 0;
	}

	/**
	 * Get text formatting information
	 * @param {TextNode} node - Text node
	 * @returns {{ text: string, formats: Record<string, boolean> }}
	 */
	function getTextFormatting(node) {
		const text = node.text || '';

		if (!node.format) {
			return { text, formats: {} };
		}

		return {
			text,
			formats: {
				bold: hasFormat(node.format, 'bold'),
				italic: hasFormat(node.format, 'italic'),
				strikethrough: hasFormat(node.format, 'strikethrough'),
				underline: hasFormat(node.format, 'underline'),
				code: hasFormat(node.format, 'code'),
				subscript: hasFormat(node.format, 'subscript'),
				superscript: hasFormat(node.format, 'superscript'),
				highlight: hasFormat(node.format, 'highlight')
			}
		};
	}
</script>

{#if node.type === 'paragraph'}
	<p style={node.format ? `text-align: ${node.format};` : ''}>
		{#each node.processedChildren || [] as child}
			<NodeRenderer node={child} />
		{/each}
	</p>
{:else if node.type === 'text'}
	{@const textData = getTextFormatting(node)}
	<span
		class:bold={textData.formats.bold}
		class:italic={textData.formats.italic}
		class:strikethrough={textData.formats.strikethrough}
		class:underline={textData.formats.underline}
		class:code={textData.formats.code}
		class:subscript={textData.formats.subscript}
		class:superscript={textData.formats.superscript}
		class:highlight={textData.formats.highlight}
	>
		{textData.text}
	</span>
{:else if node.type === 'image'}
	{console.log(node)}
	<Image
		src={node.src || ''}
		alt={node.altText || node.alt || ''}
		width={node.width}
		height={node.height}
		caption={node.caption || ''}
	/>
{:else if node.type === 'upload'}
	{console.log(node)}
	<Image
		src={node.value?.url || ''}
		alt={node.value?.alt || ''}
		width={node.value?.width}
		caption={node.value?.alt || ''}
	/>
{:else if node.type === 'heading'}
	{#if node.tag === 'h1'}
		<h1>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h1>
	{:else if node.tag === 'h2'}
		<h2>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h2>
	{:else if node.tag === 'h3'}
		<h3>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h3>
	{:else if node.tag === 'h4'}
		<h4>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h4>
	{:else if node.tag === 'h5'}
		<h5>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h5>
	{:else if node.tag === 'h6'}
		<h6>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h6>
	{:else}
		<h1>
			{#each node.processedChildren || [] as child}<NodeRenderer node={child} />{/each}
		</h1>
	{/if}
{:else if node.type === 'link' || node.type === 'autolink'}
	<a href={node.url || ''} target={node.target || '_blank'} rel={node.rel || 'noopener noreferrer'}>
		{#each node.processedChildren || [] as child}
			<NodeRenderer node={child} />
		{/each}
	</a>
{:else if node.type === 'list'}
	{#if node.listType === 'number'}
		<ol class="number-list">
			{#each node.processedChildren || [] as child}
				<NodeRenderer node={child} />
			{/each}
		</ol>
	{:else if node.listType === 'check'}
		<ul class="check-list">
			{#each node.processedChildren || [] as child}
				<NodeRenderer node={child} />
			{/each}
		</ul>
	{:else}
		<ul class="bullet-list">
			{#each node.processedChildren || [] as child}
				<NodeRenderer node={child} />
			{/each}
		</ul>
	{/if}
{:else if node.type === 'listitem'}
	{#if node.hasOwnProperty('checked')}
		<li class="checklist-item">
			<input type="checkbox" checked={node.checked} disabled />
			<label>
				{#each node.processedChildren || [] as child}
					<NodeRenderer node={child} />
				{/each}
			</label>
		</li>
	{:else}
		<li>
			{#each node.processedChildren || [] as child}
				<NodeRenderer node={child} />
			{/each}
		</li>
	{/if}
{:else if node.type === 'quote'}
	<blockquote>
		{#each node.processedChildren || [] as child}
			<NodeRenderer node={child} />
		{/each}
	</blockquote>
{:else if node.type === 'code'}
	<pre><code class="language-{node.language || ''}"
			>{node.children
				? node.children.map((child) => child.text || '').join('')
				: node.text || ''}</code
		></pre>
{:else if node.type === 'horizontalrule'}
	<hr />
{:else if node.type === 'linebreak'}
	<br />
{:else if node.type === 'table'}
	<table>
		{#each node.processedChildren || [] as child}
			<NodeRenderer node={child} />
		{/each}
	</table>
{:else if node.type === 'tablerow'}
	<tr>
		{#each node.processedChildren || [] as child}
			<NodeRenderer node={child} />
		{/each}
	</tr>
{:else if node.type === 'tablecell'}
	{#if node.headerState}
		<th
			colspan={node.colspan && node.colspan > 1 ? node.colspan : undefined}
			rowspan={node.rowspan && node.rowspan > 1 ? node.rowspan : undefined}
		>
			{#each node.processedChildren || [] as child}
				<NodeRenderer node={child} />
			{/each}
		</th>
	{:else}
		<td
			colspan={node.colspan && node.colspan > 1 ? node.colspan : undefined}
			rowspan={node.rowspan && node.rowspan > 1 ? node.rowspan : undefined}
		>
			{#each node.processedChildren || [] as child}
				<NodeRenderer node={child} />
			{/each}
		</td>
	{/if}
{:else}
	<!-- Handle unknown node types by rendering children if they exist -->
	{#each node.processedChildren || [] as child}
		<NodeRenderer node={child} />
	{/each}
{/if}

<style lang="postcss">
	.bold {
		font-weight: bold;
	}
	.italic {
		font-style: italic;
	}
	.strikethrough {
		text-decoration: line-through;
	}
	.underline {
		text-decoration: underline;
	}
	.code {
		font-family: monospace;
		background-color: #f5f5f5;
		padding: 0.2em 0.4em;
		border-radius: 3px;
	}
	.subscript {
		vertical-align: sub;
		font-size: smaller;
	}
	.superscript {
		vertical-align: super;
		font-size: smaller;
	}
	.highlight {
		background-color: yellow;
	}

	.checklist-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.checklist-item input[type='checkbox'] {
		margin-top: 0.2rem;
	}

	.checklist-item label {
		flex: 1;
		cursor: default;
	}
</style>
