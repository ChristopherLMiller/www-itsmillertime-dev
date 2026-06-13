import { describe, expect, it } from 'vitest';

import { convertDate } from './convertDate';

describe('convertDate', () => {
	it('returns Invalid Date for null', () => {
		expect(convertDate(null)).toBe('Invalid Date');
	});

	it('formats ISO instant string', () => {
		const s = convertDate('2024-06-15T12:00:00.000Z');
		expect(s).toMatch(/June/);
		expect(s).toMatch(/2024/);
		expect(s).toMatch(/15/);
	});

	it('returns Invalid Date for garbage input', () => {
		expect(convertDate('not-a-date')).toBe('Invalid Date');
	});
});
