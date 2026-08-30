import { describe, expect, it } from 'vitest';
import {
	cookieHeaderForCms,
	cookieNameForSite,
	dedupeSetCookies,
	isSessionCookieName,
	parseRewrittenSetCookie,
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

	it('makes production Secure cookies usable on local HTTP', () => {
		const raw =
			'__Secure-better-auth.session_token=abc; Max-Age=2592000; Path=/api/auth; HttpOnly; Secure; SameSite=None; Partitioned; Domain=.itsmillertime.dev';
		expect(rewriteProxiedAuthCookie(raw, true)).toBe(
			'better-auth.session_token=abc; Max-Age=2592000; HttpOnly; Path=/; SameSite=Lax'
		);
	});

	it('html-hops OAuth callback redirects so mobile Chrome can store cookies', () => {
		expect(shouldCommitCookiesWithHtmlHop('GET', 302, 'oauth2/callback/authentik', [])).toBe(true);
		expect(shouldCommitCookiesWithHtmlHop('POST', 302, 'sign-in/oauth2', [])).toBe(false);
		expect(shouldCommitCookiesWithHtmlHop('GET', 200, 'get-session', [])).toBe(false);
	});

	it('preserves signed 2FA cookie values that contain =', () => {
		const raw =
			'__Secure-better-auth.two_factor=2fa-abc.abcdefghijklmnopqrstuvwxyz0123456789abc=; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax';
		expect(rewriteProxiedAuthCookie(raw, true)).toBe(
			'better-auth.two_factor=2fa-abc.abcdefghijklmnopqrstuvwxyz0123456789abc=; Max-Age=600; HttpOnly; Path=/; SameSite=Lax'
		);
	});

	it('sends both cookie name variants so CMS can match http or https lookup', () => {
		expect(cookieHeaderForCms('better-auth.two_factor=2fa-abc.sig=; other=1', true)).toBe(
			'better-auth.two_factor=2fa-abc.sig=; other=1; __Secure-better-auth.two_factor=2fa-abc.sig='
		);
		expect(cookieHeaderForCms('better-auth.session_token=abc', false)).toBe(
			'better-auth.session_token=abc'
		);
	});

	it('parses rewritten Set-Cookie including a trailing = in the value', () => {
		const parsed = parseRewrittenSetCookie(
			'better-auth.two_factor=2fa-abc.abcdefghijklmnopqrstuvwxyz0123456789abc=; Max-Age=600; HttpOnly; Path=/; SameSite=Lax'
		);
		expect(parsed).toEqual({
			name: 'better-auth.two_factor',
			value: '2fa-abc.abcdefghijklmnopqrstuvwxyz0123456789abc=',
			maxAge: 600,
			httpOnly: true
		});
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
