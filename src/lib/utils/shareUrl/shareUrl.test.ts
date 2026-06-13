import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildFacebookShareUrl, copyToClipboard, generateShareUrl } from './shareUrl';

describe('buildFacebookShareUrl', () => {
	it('uses sharer.php when no app id', () => {
		const u = buildFacebookShareUrl('https://example.com/foo?q=1', undefined);
		expect(u).toBe(
			`https://www.facebook.com/sharer.php?u=${encodeURIComponent('https://example.com/foo?q=1')}`
		);
	});

	it('uses dialog.share when app id is set', () => {
		const u = buildFacebookShareUrl('https://example.com/path', 'abc123');
		expect(u).toContain('facebook.com/dialog/share');
		expect(u).toContain('app_id=abc123');
		expect(u).toContain(`href=${encodeURIComponent('https://example.com/path')}`);
	});
});

describe('generateShareUrl', () => {
	const url = 'https://itsmillertime.dev/post';

	it('builds twitter intent URL', () => {
		const out = generateShareUrl('twitter', url, 'Hello');
		expect(out).toBe(
			`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Hello')}`
		);
	});

	it('builds linkedin URL', () => {
		expect(generateShareUrl('linkedin', url)).toBe(
			`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
		);
	});

	it('builds reddit URL with title', () => {
		expect(generateShareUrl('reddit', url, 'My title')).toBe(
			`https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('My title')}`
		);
	});
});

describe('copyToClipboard', () => {
	const originalNavigator = globalThis.navigator;

	afterEach(() => {
		Object.defineProperty(globalThis, 'navigator', {
			value: originalNavigator,
			configurable: true,
			writable: true
		});
		vi.restoreAllMocks();
	});

	it('returns true when clipboard writes successfully', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(globalThis, 'navigator', {
			value: { clipboard: { writeText } },
			configurable: true,
			writable: true
		});

		await expect(copyToClipboard('hello')).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith('hello');
	});

	it('returns false when clipboard rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'));
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		Object.defineProperty(globalThis, 'navigator', {
			value: { clipboard: { writeText } },
			configurable: true,
			writable: true
		});

		await expect(copyToClipboard('x')).resolves.toBe(false);
		errSpy.mockRestore();
	});
});
