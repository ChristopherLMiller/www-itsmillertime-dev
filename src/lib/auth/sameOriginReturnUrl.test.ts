import { describe, expect, it } from 'vitest';
import { browserFacingLocation, sameOriginReturnUrl } from './sameOriginReturnUrl';

describe('sameOriginReturnUrl', () => {
	const origin = 'https://www.itsmillertime.dev';

	it('uses the fallback when raw is missing', () => {
		expect(sameOriginReturnUrl(null, origin, '/account/profile')).toBe(`${origin}/account/profile`);
	});

	it('accepts a same-origin URL', () => {
		expect(sameOriginReturnUrl(`${origin}/account/profile`, origin, '/')).toBe(
			`${origin}/account/profile`
		);
	});

	it('rejects a different origin', () => {
		expect(sameOriginReturnUrl('https://evil.example/phish', origin, '/account/login')).toBe(
			`${origin}/account/login`
		);
	});

	it('replays cms locations onto www', () => {
		expect(
			browserFacingLocation(
				'https://cms.itsmillertime.dev/account/profile',
				origin,
				'/account/login'
			)
		).toBe(`${origin}/account/profile`);
	});

	it('unwraps the CMS ticket continue URL', () => {
		expect(
			browserFacingLocation(
				'https://cms.itsmillertime.dev/api/frontend-oauth-continue?to=https://www.itsmillertime.dev/account/profile',
				origin,
				'/account/login'
			)
		).toBe(`${origin}/account/profile`);
	});
});
