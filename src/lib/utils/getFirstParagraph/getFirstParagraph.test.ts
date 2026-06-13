import { describe, expect, it } from 'vitest';

import { getFirstParagraph } from './getFirstParagraph';

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
