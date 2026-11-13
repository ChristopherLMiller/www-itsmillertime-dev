import { describe, expect, it } from 'vitest';

import { formatBuildTime } from './formatBuildTime';

describe('formatBuildTime', () => {
	it('formats seconds as decimal hours', () => {
		expect(formatBuildTime(5400)).toBe('1.5 Hours');
		expect(formatBuildTime(3600)).toBe('1.0 Hours');
	});

	it('rounds to one decimal place', () => {
		expect(formatBuildTime(100)).toBe('0.0 Hours');
		expect(formatBuildTime(37_800 + 200)).toBe('10.6 Hours');
	});

	it('returns null when there is no tracked time', () => {
		expect(formatBuildTime(null)).toBeNull();
		expect(formatBuildTime(undefined)).toBeNull();
		expect(formatBuildTime(0)).toBeNull();
		expect(formatBuildTime(-10)).toBeNull();
		expect(formatBuildTime(Number.NaN)).toBeNull();
	});
});
