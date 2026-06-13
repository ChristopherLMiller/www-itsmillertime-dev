import { describe, expect, it } from 'vitest';

import {
	cloneLexicalNode,
	paragraphNodeToPlainTextOnly,
	processLexicalNode,
	stripFirstCharacterFromParagraphNode
} from './lexicalProcessNode';

describe('processLexicalNode', () => {
	it('returns null for non-objects', () => {
		expect(processLexicalNode(null)).toBeNull();
		expect(processLexicalNode(undefined)).toBeNull();
		expect(processLexicalNode('text')).toBeNull();
	});

	it('returns null when type is missing', () => {
		expect(processLexicalNode({ children: [] })).toBeNull();
	});

	it('adds processedChildren mirroring children', () => {
		const leaf = { type: 'text', text: 'Hi' };
		const root = {
			type: 'paragraph',
			children: [leaf]
		};
		const out = processLexicalNode(root) as Record<string, unknown>;
		expect(out.type).toBe('paragraph');
		expect(Array.isArray(out.processedChildren)).toBe(true);
		expect((out.processedChildren as unknown[]).length).toBe(1);
	});
});

describe('cloneLexicalNode', () => {
	it('deep-clones so mutations do not affect the original', () => {
		const node = { type: 'paragraph', children: [{ text: 'ab' }] };
		const clone = cloneLexicalNode(node) as { children: { text: string }[] };
		clone.children[0].text = 'xy';
		expect((node.children as { text: string }[])[0].text).toBe('ab');
	});
});

describe('stripFirstCharacterFromParagraphNode', () => {
	it('returns the original node when not a paragraph', () => {
		const n = { type: 'heading', children: [{ text: 'Hi' }] };
		expect(stripFirstCharacterFromParagraphNode(n)).toBe(n);
	});

	it('strips the first character from the first text leaf', () => {
		const node = {
			type: 'paragraph',
			children: [{ type: 'text', text: 'Hello' }]
		};
		const out = stripFirstCharacterFromParagraphNode(node) as {
			children: { text: string }[];
		};
		expect(out.children[0].text).toBe('ello');
	});

	it('walks nested children for text', () => {
		const node = {
			type: 'paragraph',
			children: [{ type: 'link', children: [{ text: 'World' }] }]
		};
		const out = stripFirstCharacterFromParagraphNode(node) as {
			children: { children: { text: string }[] }[];
		};
		expect(out.children[0].children[0].text).toBe('orld');
	});
});

describe('paragraphNodeToPlainTextOnly', () => {
	it('replaces inline content with a single text child', () => {
		const node = {
			type: 'paragraph',
			children: [{ type: 'text', text: 'old' }]
		};
		const out = paragraphNodeToPlainTextOnly(node, 'replacement', false) as {
			type: string;
			children: { text: string }[];
		};
		expect(out.type).toBe('paragraph');
		expect(out.children).toEqual([{ type: 'text', text: 'replacement' }]);
	});

	it('appends ellipsis when requested', () => {
		const node = { type: 'paragraph', children: [] };
		const out = paragraphNodeToPlainTextOnly(node, 'tail', true) as {
			children: { text: string }[];
		};
		expect(out.children[0].text).toBe('tail…');
	});
});
