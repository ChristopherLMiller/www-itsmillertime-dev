import { describe, expect, it } from 'vitest';

import {
	getFirstParagraph,
	getLeadingParagraphsPlainText,
	mapRestPrefixToParagraphParts
} from './getFirstParagraph';

describe('getFirstParagraph', () => {
	it('returns empty string for nullish content', () => {
		expect(getFirstParagraph(null)).toBe('');
		expect(getFirstParagraph(undefined)).toBe('');
	});

	it('returns empty string when there are no paragraph nodes', () => {
		expect(getFirstParagraph({ root: { children: [] } })).toBe('');
	});

	it('returns first text from first paragraph', () => {
		const doc = {
			root: {
				children: [
					{
						type: 'paragraph',
						children: [{ text: 'Hello world' }]
					}
				]
			}
		};
		expect(getFirstParagraph(doc)).toBe('Hello world');
	});
});

describe('getLeadingParagraphsPlainText', () => {
	it('joins multiple paragraphs with blank lines', () => {
		const doc = {
			root: {
				children: [
					{ type: 'paragraph', children: [{ text: 'First paragraph.' }] },
					{ type: 'paragraph', children: [{ text: 'Second paragraph.' }] }
				]
			}
		};
		expect(getLeadingParagraphsPlainText(doc)).toBe('First paragraph.\n\nSecond paragraph.');
	});

	it('respects maxChars', () => {
		const doc = {
			root: {
				children: [
					{ type: 'paragraph', children: [{ text: 'abcdefghij' }] },
					{ type: 'paragraph', children: [{ text: 'klmnopqrst' }] }
				]
			}
		};
		expect(getLeadingParagraphsPlainText(doc, { maxChars: 12 })).toBe('abcdefghij');
	});

	it('concatenates text from inline children in a paragraph', () => {
		const doc = {
			root: {
				children: [
					{
						type: 'paragraph',
						children: [
							{ type: 'text', text: 'Hello ' },
							{ type: 'text', text: 'world' }
						]
					}
				]
			}
		};
		expect(getLeadingParagraphsPlainText(doc)).toBe('Hello world');
	});
});

describe('mapRestPrefixToParagraphParts', () => {
	it('maps a prefix across joined segments (rest after drop cap)', () => {
		const plains = ['First para.', 'Second para.'];
		expect(mapRestPrefixToParagraphParts('irst para.\n\nSecond para.', plains)).toEqual({
			fullCount: 2
		});
		expect(mapRestPrefixToParagraphParts('irst para.\n\nSec', plains)).toEqual({
			fullCount: 1,
			partialIndex: 1,
			partialPlain: 'Sec'
		});
	});
});
