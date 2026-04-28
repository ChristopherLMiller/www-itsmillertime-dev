import { describe, expect, it } from 'vitest';

import { romanize } from './romanize';

describe('romanize', () => {
	it('converts typical years', () => {
		expect(romanize(2026)).toBe('MMXXVI');
		expect(romanize(1999)).toBe('MCMXCIX');
		expect(romanize(4)).toBe('IV');
	});

	it('uses repeated M for thousands', () => {
		expect(romanize(3000)).toBe('MMM');
		expect(romanize(4000)).toBe('MMMM');
	});

	it('rejects non-positive or non-integer values', () => {
		expect(() => romanize(0)).toThrow(RangeError);
		expect(() => romanize(-1)).toThrow(RangeError);
		expect(() => romanize(Number.NaN)).toThrow(RangeError);
		expect(() => romanize(3.5)).toThrow(RangeError);
	});
});
