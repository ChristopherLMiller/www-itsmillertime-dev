import { describe, expect, it } from 'vitest';

import { cssAspectRatioFromDimensions } from './aspect-ratio';

describe('cssAspectRatioFromDimensions', () => {
	it('returns w/h when both are valid', () => {
		expect(cssAspectRatioFromDimensions(800, 400, 1)).toBe(2);
	});

	it('returns fallback when width or height is missing or non-positive', () => {
		expect(cssAspectRatioFromDimensions(null, 100, 1.5)).toBe(1.5);
		expect(cssAspectRatioFromDimensions(100, 0, 2)).toBe(2);
		expect(cssAspectRatioFromDimensions(undefined, undefined, 0.75)).toBe(0.75);
	});
});
