import { describe, expect, it } from 'vitest';
import {
	currentReturnPath,
	hrefWithCallback,
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

	it('sends logout away from profile', () => {
		expect(sanitizeLogoutReturnUrl('/account/profile', origin)).toBe(`${origin}/`);
		expect(sanitizeLogoutReturnUrl('/gallery/album', origin)).toBe(`${origin}/gallery/album`);
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
