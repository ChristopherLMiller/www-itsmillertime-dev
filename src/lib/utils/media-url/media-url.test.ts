import { describe, expect, it } from 'vitest';

import { getMediaUrl, isVideoMedia } from './media-url';

describe('getMediaUrl', () => {
	it('returns empty string for missing path', () => {
		expect(getMediaUrl(null)).toBe('');
		expect(getMediaUrl(undefined)).toBe('');
	});

	it('prefixes non-proxy paths with PUBLIC_PAYLOAD_URL', () => {
		expect(getMediaUrl('/media/foo.jpg', false)).toMatch(/\/media\/foo\.jpg$/);
	});

	it('uses media proxy when requested', () => {
		expect(getMediaUrl('/private/x.png', true)).toBe('/api/media-proxy/private/x.png');
	});
});

describe('isVideoMedia', () => {
	it('returns false for null', () => {
		expect(isVideoMedia(null)).toBe(false);
	});

	it('detects video mime type', () => {
		expect(isVideoMedia({ mimeType: 'video/mp4' })).toBe(true);
	});

	it('detects YouTube URL', () => {
		expect(isVideoMedia({ url: 'https://www.youtube.com/watch?v=abc' })).toBe(true);
		expect(isVideoMedia({ url: 'https://youtu.be/abc' })).toBe(true);
	});

	it('returns false for plain images', () => {
		expect(isVideoMedia({ mimeType: 'image/jpeg', url: '/a.jpg' })).toBe(false);
	});
});
