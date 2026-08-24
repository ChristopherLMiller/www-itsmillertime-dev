import { describe, expect, it } from 'vitest';
import {
	cookieNameForSite,
	dedupeSetCookies,
	isSessionCookieName,
	rewriteProxiedAuthCookie,
	sessionCookieDomain,
	shouldCommitCookiesWithHtmlHop
} from './sessionCookie';

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

	it('keeps session cookies host-only', () => {
		expect(sessionCookieDomain('www.itsmillertime.dev', false)).toBeUndefined();
		expect(sessionCookieDomain('itsmillertime.dev', false)).toBeUndefined();
		expect(sessionCookieDomain('localhost:5173', true)).toBeUndefined();
	});

	it('strips Domain= from proxied auth cookies', () => {
		const raw =
			'__Secure-better-auth.session_token=abc; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=.itsmillertime.dev';
		expect(rewriteProxiedAuthCookie(raw, false)).toBe(
			'__Secure-better-auth.session_token=abc; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax'
		);
	});

	it('html-hops OAuth callback redirects so mobile Chrome can store cookies', () => {
		expect(shouldCommitCookiesWithHtmlHop('GET', 302, 'oauth2/callback/authentik', [])).toBe(true);
		expect(shouldCommitCookiesWithHtmlHop('POST', 302, 'sign-in/oauth2', [])).toBe(false);
		expect(shouldCommitCookiesWithHtmlHop('GET', 200, 'get-session', [])).toBe(false);
	});

	it('dedupes duplicate Set-Cookie names', () => {
		expect(
			dedupeSetCookies([
				'__Secure-better-auth.state=a; Path=/',
				'__Secure-better-auth.state=b; Path=/'
			])
		).toEqual(['__Secure-better-auth.state=b; Path=/']);
	});
});
