/**
 * Same shape as Lexical.svelte `processNode` — adds processedChildren for NodeRenderer.
 */
export function processLexicalNode(node: unknown): unknown {
	if (!node || typeof node !== 'object' || !('type' in node)) return null;
	const n = node as { type: string; children?: unknown[] };
	return {
		...n,
		processedChildren: n.children
			? n.children.map((child) => processLexicalNode(child)).filter(Boolean)
			: []
	};
}

/** Deep clone Lexical JSON before mutating for display variants */
export function cloneLexicalNode(node: unknown): unknown {
	return JSON.parse(JSON.stringify(node));
}

/** Remove the first character from the first text leaf in a paragraph node (for drop cap). */
export function stripFirstCharacterFromParagraphNode(node: unknown): unknown {
	const cloned = cloneLexicalNode(node) as Record<string, unknown>;
	if (cloned.type !== 'paragraph' || !Array.isArray(cloned.children)) return node;

	function stripInChildren(children: unknown[]): boolean {
		for (const child of children) {
			if (child == null || typeof child !== 'object') continue;
			const c = child as Record<string, unknown>;
			if (typeof c.text === 'string' && c.text.length > 0) {
				c.text = c.text.slice(1);
				return true;
			}
			if (Array.isArray(c.children) && stripInChildren(c.children)) return true;
		}
		return false;
	}

	stripInChildren(cloned.children as unknown[]);
	return cloned;
}

/** Truncate paragraph to plain text (single text child) for overflow tail */
export function paragraphNodeToPlainTextOnly(
	node: unknown,
	plainText: string,
	addEllipsis: boolean
): unknown {
	const base = cloneLexicalNode(node) as Record<string, unknown>;
	const suffix = addEllipsis ? '…' : '';
	return {
		...base,
		type: 'paragraph',
		children: [{ type: 'text', text: plainText + suffix }]
	};
}
