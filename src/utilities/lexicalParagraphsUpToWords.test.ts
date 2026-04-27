import { describe, expect, it } from 'vitest';

import { getLexicalParagraphsUpToWords } from './lexicalParagraphsUpToWords';

describe('getLexicalParagraphsUpToWords', () => {
	it('returns full text when the document is under the word cap', () => {
		const doc = {
			root: {
				children: [{ type: 'paragraph', children: [{ text: 'One two three four five.' }] }]
			}
		};
		const r = getLexicalParagraphsUpToWords(doc, 10);
		expect(r.hasMore).toBe(false);
		expect(r.blocks).toHaveLength(1);
		expect(r.blocks[0].plain).toBe('One two three four five.');
		expect(r.blocks[0].isWordTruncated).toBeFalsy();
	});

	it('truncates at a word boundary and sets hasMore', () => {
		const doc = {
			root: {
				children: [{ type: 'paragraph', children: [{ text: 'a b c d e f g h' }] }]
			}
		};
		const r = getLexicalParagraphsUpToWords(doc, 3);
		expect(r.hasMore).toBe(true);
		expect(r.blocks[0].plain).toBe('a b c');
		expect(r.blocks[0].isWordTruncated).toBe(true);
	});

	it('stops at the end of a paragraph when the next has more', () => {
		const doc = {
			root: {
				children: [
					{ type: 'paragraph', children: [{ text: 'w1 w2 w3' }] },
					{ type: 'paragraph', children: [{ text: 'w4' }] }
				]
			}
		};
		const r = getLexicalParagraphsUpToWords(doc, 3);
		expect(r.hasMore).toBe(true);
		expect(r.blocks).toHaveLength(1);
		expect(r.blocks[0].plain).toBe('w1 w2 w3');
	});
});
