type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] };

export type LexicalRootDoc = {
	root: {
		type: string;
		children: LexicalNode[];
		direction: 'ltr' | 'rtl' | null;
		format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
		indent: number;
		version: number;
	};
};

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

/**
 * Build a minimal Lexical document from plain text (paragraphs split on blank lines).
 * Empty / whitespace-only input returns null (clears the CMS caption field).
 */
export function plainTextToLexical(text: string): LexicalRootDoc | null {
	const normalized = text.replace(/\r\n/g, '\n').trim();
	if (!normalized) return null;

	const paragraphs = normalized.split(/\n+/).map((p) => p.trim()).filter(Boolean);
	if (paragraphs.length === 0) return null;

	return {
		root: {
			type: 'root',
			direction: 'ltr',
			format: '',
			indent: 0,
			version: 1,
			children: paragraphs.map((paragraph) => ({
				type: 'paragraph',
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1,
				children: [
					{
						type: 'text',
						text: paragraph,
						format: 0,
						mode: 'normal',
						style: '',
						detail: 0,
						version: 1
					}
				]
			}))
		}
	};
}
