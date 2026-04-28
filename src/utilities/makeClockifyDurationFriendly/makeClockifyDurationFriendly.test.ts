import { describe, expect, it } from 'vitest';

import { makeClockifyDurationFriendly } from './makeClockifyDurationFriendly';

describe('makeClockifyDurationFriendly', () => {
	it('returns N/A for invalid ISO duration', () => {
		expect(makeClockifyDurationFriendly('not-a-duration')).toBe('N/A');
	});

	it('formats PT duration as human-readable parts', () => {
		const out = makeClockifyDurationFriendly('PT2H30M');
		expect(out).toContain('2Hours');
		expect(out).toContain('30Minutes');
	});

	it('supports decimal hours output', () => {
		expect(makeClockifyDurationFriendly('PT1H30M', false, true)).toBe('1.5 Hours');
	});

	it('can include seconds when requested', () => {
		const out = makeClockifyDurationFriendly('PT1M5S', true);
		expect(out).toContain('5Secs');
	});
});
