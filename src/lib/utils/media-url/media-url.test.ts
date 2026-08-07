import { describe, expect, it } from 'vitest';

import {
	getLightboxPaintUrl,
	getLightboxZoomUrl,
	getMediaUrl,
	isGifMedia,
	isVideoMedia
} from './media-url';

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

describe('getLightboxPaintUrl', () => {
	it('prefers xlarge then large over original', () => {
		expect(
			getLightboxPaintUrl({
				url: '/media/orig.jpg',
				sizes: {
					xlarge: { url: '/media/xl.jpg' },
					large: { url: '/media/lg.jpg' }
				}
			})
		).toMatch(/\/media\/xl\.jpg$/);

		expect(
			getLightboxPaintUrl({
				url: '/media/orig.jpg',
				sizes: { large: { url: '/media/lg.jpg' } }
			})
		).toMatch(/\/media\/lg\.jpg$/);
	});

	it('uses original for gifs', () => {
		expect(
			getLightboxPaintUrl({
				url: '/media/dance.gif',
				mimeType: 'image/gif',
				sizes: { xlarge: { url: '/media/dance-xl.jpg' } }
			})
		).toMatch(/\/media\/dance\.gif$/);
	});
});

describe('getLightboxZoomUrl', () => {
	it('always uses the original url', () => {
		expect(
			getLightboxZoomUrl({
				url: '/media/orig.jpg',
				sizes: { xlarge: { url: '/media/xl.jpg' } }
			})
		).toMatch(/\/media\/orig\.jpg$/);
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

describe('isGifMedia', () => {
	it('detects gif mime type', () => {
		expect(isGifMedia({ mimeType: 'image/gif' })).toBe(true);
	});

	it('detects gif filename or url', () => {
		expect(isGifMedia({ filename: 'dance.gif' })).toBe(true);
		expect(isGifMedia({ url: '/api/media/file/dance.gif' })).toBe(true);
	});

	it('returns false for non-gifs', () => {
		expect(isGifMedia({ mimeType: 'image/jpeg', filename: 'x.jpg' })).toBe(false);
		expect(isGifMedia(null)).toBe(false);
	});
});
