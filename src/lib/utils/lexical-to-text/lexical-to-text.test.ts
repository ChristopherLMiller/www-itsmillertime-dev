import { describe, expect, it } from 'vitest';

import { lexicalToPlainText, plainTextToLexical } from './lexical-to-text';

describe('lexicalToPlainText', () => {
	it('returns empty string for nullish input', () => {
		expect(lexicalToPlainText(null)).toBe('');
		expect(lexicalToPlainText(undefined)).toBe('');
		expect(lexicalToPlainText({})).toBe('');
	});

	it('extracts text from paragraph children', () => {
		const doc = {
			root: {
				children: [
					{
						type: 'paragraph',
						children: [{ type: 'text', text: 'Hello', format: 0 }],
						direction: 'ltr',
						format: '',
						indent: 0,
						version: 1
					}
				],
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1
			}
		};
		expect(lexicalToPlainText(doc)).toBe('Hello');
	});

	it('normalizes whitespace', () => {
		const doc = {
			root: {
				children: [
					{
						type: 'paragraph',
						children: [{ type: 'text', text: '  a   b  ', format: 0 }],
						direction: 'ltr',
						format: '',
						indent: 0,
						version: 1
					}
				],
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1
			}
		};
		expect(lexicalToPlainText(doc)).toBe('a b');
	});
});

describe('plainTextToLexical', () => {
	it('returns null for empty input', () => {
		expect(plainTextToLexical('')).toBeNull();
		expect(plainTextToLexical('   ')).toBeNull();
	});

	it('round-trips plain text through Lexical', () => {
		const doc = plainTextToLexical('Hello world');
		expect(doc).not.toBeNull();
		expect(lexicalToPlainText(doc)).toBe('Hello world');
	});

	it('splits paragraphs on blank lines', () => {
		const doc = plainTextToLexical('One\n\nTwo');
		expect(doc?.root.children).toHaveLength(2);
		expect(lexicalToPlainText(doc)).toBe('One Two');
	});
});
