import { describe, expect, it } from 'vitest';
import {
	currentReturnPath,
	headerReferer,
	hrefWithCallback,
	parseReturnUrl,
	resolveReturnUrl,
	sanitizeLogoutReturnUrl,
	sanitizeReturnUrl,
	urlToPath
} from './returnTo';

describe('returnTo', () => {
	const origin = 'https://www.itsmillertime.dev';

	it('keeps a same-origin content path', () => {
		expect(sanitizeReturnUrl('/articles/hello', origin, '/account/profile')).toBe(
			`${origin}/articles/hello`
		);
	});

	it('rejects auth flow paths', () => {
		expect(sanitizeReturnUrl('/account/login', origin, '/account/profile')).toBe(
			`${origin}/account/profile`
		);
		expect(sanitizeReturnUrl('/account/logout', origin, '/')).toBe(`${origin}/`);
	});

	it('parses a referrer URL and skips auth pages', () => {
		expect(parseReturnUrl(`${origin}/galleries/stephanie`, origin)).toBe(
			`${origin}/galleries/stephanie`
		);
		expect(parseReturnUrl(`${origin}/account/login`, origin)).toBeNull();
		expect(parseReturnUrl('https://evil.example/steal', origin)).toBeNull();
		expect(parseReturnUrl('', origin)).toBeNull();
	});

	it('prefers callbackURL, then referrer, then the fallback', () => {
		expect(
			resolveReturnUrl(origin, '/account/profile', [
				'/galleries/album',
				`${origin}/articles/hello`
			])
		).toBe(`${origin}/galleries/album`);
		expect(
			resolveReturnUrl(origin, '/account/profile', [null, `${origin}/articles/hello`])
		).toBe(`${origin}/articles/hello`);
		expect(resolveReturnUrl(origin, '/account/profile', [null, '/account/login'])).toBe(
			`${origin}/account/profile`
		);
		expect(resolveReturnUrl(origin, '/', [])).toBe(`${origin}/`);
	});

	it('sends logout away from profile, otherwise back to the referrer', () => {
		expect(sanitizeLogoutReturnUrl('/account/profile', origin)).toBe(`${origin}/`);
		expect(sanitizeLogoutReturnUrl(null, origin, `${origin}/account/profile`)).toBe(`${origin}/`);
		expect(sanitizeLogoutReturnUrl(null, origin, `${origin}/gallery/album`)).toBe(
			`${origin}/gallery/album`
		);
		expect(sanitizeLogoutReturnUrl(null, origin, null)).toBe(`${origin}/`);
	});

	it('reads the Referer header', () => {
		expect(headerReferer(new Headers({ referer: `${origin}/articles/x` }))).toBe(
			`${origin}/articles/x`
		);
		expect(headerReferer(new Headers({ referrer: `${origin}/articles/x` }))).toBe(
			`${origin}/articles/x`
		);
		expect(headerReferer(new Headers())).toBeNull();
	});

	it('omits a return path on auth pages', () => {
		expect(currentReturnPath(new URL(`${origin}/account/login`))).toBeNull();
		expect(currentReturnPath(new URL(`${origin}/articles/x`))).toBe('/articles/x');
		expect(
			currentReturnPath(new URL(`${origin}/account/profile`), ['/account/profile'])
		).toBeNull();
	});

	it('appends callbackURL to login and logout hrefs', () => {
		expect(hrefWithCallback('/account/login', '/gallery/foo?page=2')).toBe(
			'/account/login?callbackURL=%2Fgallery%2Ffoo%3Fpage%3D2'
		);
		expect(hrefWithCallback('/account/logout', null)).toBe('/account/logout');
	});

	it('converts an absolute URL to a path', () => {
		expect(urlToPath(`${origin}/articles/hello?x=1`)).toBe('/articles/hello?x=1');
	});
});
