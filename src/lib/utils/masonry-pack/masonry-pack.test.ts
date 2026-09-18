import { describe, expect, it, vi } from 'vitest';

import { masonryRowSpan, nativeMasonrySupported } from './masonry-pack';

describe('masonryRowSpan', () => {
	it('packs height into implicit 8px rows including gap', () => {
		expect(masonryRowSpan(400, 8, 30)).toBe(Math.ceil((400 + 30) / (8 + 30)));
		expect(masonryRowSpan(0)).toBe(1);
		expect(masonryRowSpan(-10)).toBe(1);
	});
});

describe('nativeMasonrySupported', () => {
	it('is true when grid-lanes is implemented', () => {
		vi.stubGlobal('CSS', { supports: (prop: string, value: string) => prop === 'display' && value === 'grid-lanes' });
		expect(nativeMasonrySupported()).toBe(true);
		vi.unstubAllGlobals();
	});

	it('is false when no masonry syntax exists', () => {
		vi.stubGlobal('CSS', { supports: () => false });
		expect(nativeMasonrySupported()).toBe(false);
		vi.unstubAllGlobals();
	});
});
