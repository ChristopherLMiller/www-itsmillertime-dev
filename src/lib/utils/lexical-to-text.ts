type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] };

/**
 * Extract plain text from Payload/Lexical rich text content.
 * Use for simple display contexts (e.g. gallery descriptions) where
 * formatted output isn't needed.
 */
export function lexicalToPlainText(
	content: { root?: { children?: LexicalNode[] } } | null | undefined
): string {
	if (!content?.root?.children?.length) return '';

	const parts: string[] = [];

	function visit(nodes: LexicalNode[]) {
		for (const node of nodes) {
			if (node.type === 'text' && typeof node.text === 'string') {
				parts.push(node.text);
			} else if (Array.isArray(node.children) && node.children.length > 0) {
				const isBlock = ['paragraph', 'heading', 'listitem', 'quote'].includes(node.type ?? '');
				if (isBlock && parts.length > 0) parts.push(' ');
				visit(node.children);
			}
		}
	}

	visit(content.root.children);
	return parts.join('').replace(/\s+/g, ' ').trim();
}
