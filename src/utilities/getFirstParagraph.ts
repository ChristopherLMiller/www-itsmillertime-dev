/** Lexical / rich-text: pull plain text from a node tree (text, links, line breaks, etc.) */
function plainTextFromLexicalNode(node: unknown): string {
	if (node == null || typeof node !== 'object') return '';
	const n = node as Record<string, unknown>;
	if (n.type === 'linebreak') return '\n';
	/** Payload often stores leaf text as `{ text: '…' }` without `type: 'text'` */
	if (typeof n.text === 'string') return n.text;
	if (Array.isArray(n.children)) {
		return n.children.map((c) => plainTextFromLexicalNode(c)).join('');
	}
	return '';
}

export function paragraphPlainText(paragraph: unknown): string {
	if (paragraph == null || typeof paragraph !== 'object') return '';
	const n = paragraph as Record<string, unknown>;
	if (n.type !== 'paragraph' || !Array.isArray(n.children)) return '';
	return n.children
		.map((c) => plainTextFromLexicalNode(c))
		.join('')
		.trim();
}

export interface LeadingParagraphsOptions {
	/** Max paragraph blocks to include (default 40) */
	maxParagraphs?: number;
	/** Hard cap on total characters (default 16000) */
	maxChars?: number;
}

export interface LeadingParagraphBlock {
	plain: string;
	node: unknown;
}

/**
 * Consecutive top-level paragraph nodes with plain text and original Lexical nodes (for rendering).
 */
export function getLeadingParagraphBlocks(
	contents: unknown,
	options?: LeadingParagraphsOptions
): LeadingParagraphBlock[] {
	const maxParagraphs = options?.maxParagraphs ?? 40;
	const maxChars = options?.maxChars ?? 16000;
	if (!contents || typeof contents !== 'object') return [];
	const root = (contents as { root?: { children?: unknown[] } }).root;
	if (!root?.children?.length) return [];

	const paragraphs = root.children.filter(
		(child) =>
			typeof child === 'object' &&
			child !== null &&
			(child as { type?: string }).type === 'paragraph'
	);

	const blocks: LeadingParagraphBlock[] = [];
	let total = 0;

	for (let i = 0; i < paragraphs.length && i < maxParagraphs; i++) {
		const node = paragraphs[i];
		const plain = paragraphPlainText(node);
		if (!plain) continue;

		const sep = blocks.length ? 2 : 0;
		const nextLen = total + sep + plain.length;
		if (nextLen <= maxChars) {
			blocks.push({ plain, node });
			total = nextLen;
		} else {
			const remaining = maxChars - total - sep;
			if (remaining > 0) {
				blocks.push({
					plain: plain.slice(0, remaining),
					node
				});
			}
			break;
		}
	}

	return blocks;
}

/**
 * Map a prefix of `leadParaRest` (concatenated segment strings joined with \\n\\n) to full paragraph
 * indices and optional partial tail for the last visible paragraph.
 */
export function mapRestPrefixToParagraphParts(
	restPrefix: string,
	plains: string[]
): { fullCount: number; partialIndex?: number; partialPlain?: string } {
	if (!plains.length) return { fullCount: 0 };
	const segs = plains.map((p, i) => (i === 0 ? p.slice(1) : p));
	const fullJoin = segs.join('\n\n');
	if (!restPrefix.length) return { fullCount: 0 };
	if (restPrefix.length >= fullJoin.length) {
		return { fullCount: plains.length };
	}

	let offset = 0;
	for (let i = 0; i < segs.length; i++) {
		const seg = segs[i];
		const segEnd = offset + seg.length;
		if (restPrefix.length < segEnd) {
			return {
				fullCount: i,
				partialIndex: i,
				partialPlain: restPrefix.slice(offset)
			};
		}
		if (restPrefix.length === segEnd) {
			return { fullCount: i + 1 };
		}
		offset = segEnd + 2;
	}
	return { fullCount: plains.length };
}

export const getFirstParagraph = (contents: unknown) => {
	if (contents == null || typeof contents !== 'object') return '';
	const root = (contents as { root?: { children?: unknown[] } }).root;
	if (!root?.children?.length) return '';
	const paragraphs = root.children.filter(
		(child) =>
			typeof child === 'object' &&
			child !== null &&
			(child as { type?: string }).type === 'paragraph'
	);
	if (paragraphs.length === 0) return '';
	const first = paragraphs[0] as { children?: { text?: string }[] };
	if (first.children && first.children.length > 0 && typeof first.children[0].text === 'string') {
		return first.children[0].text;
	}
	return '';
};

/**
 * Plain text from consecutive top-level paragraph nodes, joined with blank lines.
 * Skips empty paragraphs. Use for excerpts that need more than the first block.
 */
export function getLeadingParagraphsPlainText(
	contents: unknown,
	options?: LeadingParagraphsOptions
): string {
	const blocks = getLeadingParagraphBlocks(contents, options);
	return blocks.map((b) => b.plain).join('\n\n');
}
