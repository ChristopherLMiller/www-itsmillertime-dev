function plainTextFromLexicalNode(node: unknown): string {
	if (node == null || typeof node !== 'object') return '';
	const n = node as Record<string, unknown>;
	if (n.type === 'linebreak') return '\n';
	if (typeof n.text === 'string') return n.text;
	if (Array.isArray(n.children)) {
		return n.children.map((c) => plainTextFromLexicalNode(c)).join('');
	}
	return '';
}

function paragraphPlainTextFromRootChild(paragraph: unknown): string {
	if (paragraph == null || typeof paragraph !== 'object') return '';
	const n = paragraph as Record<string, unknown>;
	if (n.type !== 'paragraph' || !Array.isArray(n.children)) return '';
	return n.children.map((c) => plainTextFromLexicalNode(c)).join('').trim();
}

export interface LexicalParagraphExcerpt {
	plain: string;
	node: unknown;
	/** Set when `plain` is only a prefix of the paragraph (word or char cap). */
	isWordTruncated?: boolean;
}

export interface LexicalParagraphsUpToWordsOptions {
	/** Max top-level `paragraph` nodes to consider (default 40) */
	maxParagraphs?: number;
	/** Cap on total characters in the joined virtual excerpt, `\n\n` between blocks (default 16000) */
	maxChars?: number;
}

function splitWordTokens(plain: string): string[] {
	if (!plain.trim()) return [];
	return plain.trim().split(/\s+/).filter((t) => t.length > 0);
}

/**
 * From Lexical `root` JSON (`{ root: { children } }` or a bare root), take consecutive
 * top-level `paragraph` nodes in order, stopping after `maxWords` (whitespace boundaries).
 * Respects `maxChars` and `maxParagraphs` as safety limits.
 */
export function getLexicalParagraphsUpToWords(
	contents: unknown,
	maxWords: number,
	options?: LexicalParagraphsUpToWordsOptions
): { blocks: LexicalParagraphExcerpt[]; hasMore: boolean } {
	const maxParagraphs = options?.maxParagraphs ?? 40;
	const maxChars = options?.maxChars ?? 16000;
	const empty: { blocks: LexicalParagraphExcerpt[]; hasMore: boolean } = { blocks: [], hasMore: false };

	if (!contents || typeof contents !== 'object' || maxWords <= 0) return empty;

	const root = (contents as { root?: { children?: unknown[] } }).root;
	if (!root?.children?.length) return empty;

	const paragraphs = root.children.filter(
		(child) =>
			typeof child === 'object' &&
			child !== null &&
			(child as { type?: string }).type === 'paragraph'
	);

	const blocks: LexicalParagraphExcerpt[] = [];
	let wordsUsed = 0;
	let total = 0;

	for (let i = 0; i < paragraphs.length && i < maxParagraphs; i++) {
		const node = paragraphs[i];
		const plain = paragraphPlainTextFromRootChild(node);
		if (!plain) continue;

		const wordTokens = splitWordTokens(plain);
		if (wordTokens.length === 0) continue;

		const sep = blocks.length ? 2 : 0;
		const wouldChars = total + sep + plain.length;
		if (wouldChars > maxChars) {
			const remaining = maxChars - total - sep;
			if (remaining < 1) {
				return finalize(blocks, paragraphs, maxParagraphs);
			}
			let acc = '';
			for (const w of wordTokens) {
				const next = acc ? `${acc} ${w}` : w;
				if (next.length > remaining) {
					if (acc.length < 1) {
						return finalize(blocks, paragraphs, maxParagraphs);
					}
					blocks.push({ plain: acc, node, isWordTruncated: true });
					return finalize(blocks, paragraphs, maxParagraphs);
				}
				acc = next;
			}
			if (acc.length) {
				blocks.push({ plain: acc, node, isWordTruncated: acc.length < plain.length });
			}
			return finalize(blocks, paragraphs, maxParagraphs);
		}

		if (wordsUsed + wordTokens.length <= maxWords) {
			blocks.push({ plain, node });
			wordsUsed += wordTokens.length;
			total = wouldChars;
		} else {
			const need = maxWords - wordsUsed;
			if (need < 1) {
				return finalize(blocks, paragraphs, maxParagraphs);
			}
			const take = wordTokens.slice(0, need);
			const partialPlain = take.join(' ');
			blocks.push({ plain: partialPlain, node, isWordTruncated: true });
			return finalize(blocks, paragraphs, maxParagraphs);
		}
	}

	return finalize(blocks, paragraphs, maxParagraphs);
}

function finalize(
	blocks: LexicalParagraphExcerpt[],
	paragraphs: unknown[],
	maxParagraphs: number
): { blocks: LexicalParagraphExcerpt[]; hasMore: boolean } {
	return { blocks, hasMore: hasMoreTextAfter(paragraphs, blocks, maxParagraphs) };
}

function hasMoreTextAfter(
	paragraphs: unknown[],
	blocks: LexicalParagraphExcerpt[],
	maxParagraphs: number
): boolean {
	if (paragraphs.length > maxParagraphs) {
		return true;
	}
	let fullDocWords = 0;
	for (let i = 0; i < Math.min(paragraphs.length, maxParagraphs); i++) {
		fullDocWords += splitWordTokens(paragraphPlainTextFromRootChild(paragraphs[i])).length;
	}
	let shownWords = 0;
	for (const b of blocks) {
		shownWords += splitWordTokens(b.plain).length;
	}
	return shownWords < fullDocWords;
}
