import { describe, expect, it } from 'vitest';
import { isSafeSiteReturnPath, sanitizeAdminReturnPath, siteReturnPathFromUrl } from './returnTo';

describe('admin return path', () => {
	it('keeps a public page with search and hash', () => {
		expect(isSafeSiteReturnPath('/galleries/air-show?image=12#photo')).toBe(true);
		expect(sanitizeAdminReturnPath('/articles/hello?x=1')).toBe('/articles/hello?x=1');
	});

	it('rejects admin and protocol-relative paths', () => {
		expect(isSafeSiteReturnPath('/admin')).toBe(false);
		expect(isSafeSiteReturnPath('/admin/settings/ai')).toBe(false);
		expect(isSafeSiteReturnPath('//evil.example/phish')).toBe(false);
		expect(isSafeSiteReturnPath('https://evil.example/')).toBe(false);
		expect(sanitizeAdminReturnPath('/admin/settings')).toBe('/');
		expect(sanitizeAdminReturnPath(null)).toBe('/');
	});

	it('reads the current site URL and ignores admin URLs', () => {
		expect(siteReturnPathFromUrl(new URL('https://www.itsmillertime.dev/galleries/x?i=1'))).toBe(
			'/galleries/x?i=1'
		);
		expect(siteReturnPathFromUrl(new URL('https://www.itsmillertime.dev/admin'))).toBeNull();
	});
});
