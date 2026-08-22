import { describe, expect, it } from 'vitest';
import { cookieNameForSite, isSessionCookieName, sessionCookieDomain } from './sessionCookie';

describe('session cookie handoff helpers', () => {
	it('accepts better-auth session cookie names', () => {
		expect(isSessionCookieName('better-auth.session_token')).toBe(true);
		expect(isSessionCookieName('__Secure-better-auth.session_token')).toBe(true);
		expect(isSessionCookieName('better-auth.session_data')).toBe(false);
	});

	it('strips __Secure- in local HTTP', () => {
		expect(cookieNameForSite('__Secure-better-auth.session_token', true)).toBe(
			'better-auth.session_token'
		);
		expect(cookieNameForSite('__Secure-better-auth.session_token', false)).toBe(
			'__Secure-better-auth.session_token'
		);
	});

	it('shares the cookie across itsmillertime.dev hosts in production', () => {
		expect(sessionCookieDomain('www.itsmillertime.dev', false)).toBe('.itsmillertime.dev');
		expect(sessionCookieDomain('itsmillertime.dev', false)).toBe('.itsmillertime.dev');
		expect(sessionCookieDomain('localhost:5173', false)).toBeUndefined();
		expect(sessionCookieDomain('www.itsmillertime.dev', true)).toBeUndefined();
	});
});
