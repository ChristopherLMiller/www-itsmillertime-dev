import { describe, expect, it } from 'vitest';

import { lexicalToPlainText } from './lexical-to-text';

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
