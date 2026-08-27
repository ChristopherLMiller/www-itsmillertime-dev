import { describe, expect, it, vi } from 'vitest';

import {
	galleryFileUrlForPayloadApi,
	jpegPreviewFromBytes,
	parseAlbumTitle,
	parseSuggestedAlt,
	pickGalleryPreviewPath,
	suggestImageAlt,
	SuggestImageAltError,
	fetchGalleryPreviewBytes
} from './suggest-image-alt.server';

const PNG_1x1 = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);

describe('pickGalleryPreviewPath', () => {
	it('prefers medium, then small, then large, then original', () => {
		expect(
			pickGalleryPreviewPath({
				url: '/api/gallery-images/file/orig.avif',
				sizes: {
					small: { url: '/small.avif' },
					medium: { url: '/medium.avif' },
					large: { url: '/large.avif' }
				}
			})
		).toBe('/medium.avif');
		expect(
			pickGalleryPreviewPath({
				url: '/orig.avif',
				sizes: { small: { url: '/small.avif' } }
			})
		).toBe('/small.avif');
		expect(pickGalleryPreviewPath({ url: '/orig.avif' })).toBe('/orig.avif');
	});

	it('uses the original for GIFs and skips videos', () => {
		expect(
			pickGalleryPreviewPath({
				url: '/anim.gif',
				mimeType: 'image/gif',
				sizes: { medium: { url: '/strip.avif' } }
			})
		).toBe('/anim.gif');
		expect(
			pickGalleryPreviewPath({
				url: 'https://www.youtube.com/watch?v=abc',
				mimeType: 'video/mp4'
			})
		).toBeNull();
	});
});

describe('galleryFileUrlForPayloadApi', () => {
	it('strips a leading /api so PAYLOAD_INTERNAL_URL is not doubled', () => {
		expect(
			galleryFileUrlForPayloadApi(
				'/api/gallery-images/file/foo.avif?prefix=gallery-images',
				'http://127.0.0.1:3000/api'
			)
		).toBe('http://127.0.0.1:3000/api/gallery-images/file/foo.avif?prefix=gallery-images');
	});

	it('rewrites an absolute CMS file URL onto the internal API origin', () => {
		expect(
			galleryFileUrlForPayloadApi(
				'https://cms.itsmillertime.dev/api/gallery-images/file/foo.avif?prefix=gallery-images',
				'http://127.0.0.1:3000/api'
			)
		).toBe('http://127.0.0.1:3000/api/gallery-images/file/foo.avif?prefix=gallery-images');
	});
});

describe('parseSuggestedAlt', () => {
	it('strips labels, quotes, and fences', () => {
		expect(parseSuggestedAlt('Alt text: "Red barn at dusk"')).toBe('Red barn at dusk');
		expect(parseSuggestedAlt('```\nA biplane over a field\n```')).toBe('A biplane over a field');
		expect(parseSuggestedAlt('  Title:   two   hawks  ')).toBe('two hawks');
	});

	it('caps long suggestions', () => {
		const alt = parseSuggestedAlt('word '.repeat(80));
		expect(alt.endsWith('…')).toBe(true);
		expect(alt.length).toBeLessThanOrEqual(280);
	});
});

describe('parseAlbumTitle', () => {
	it('trims, collapses space, and caps length', () => {
		expect(parseAlbumTitle('  Goshen   Airshow  ')).toBe('Goshen Airshow');
		expect(parseAlbumTitle(12)).toBeUndefined();
		expect(parseAlbumTitle('x'.repeat(200))?.length).toBe(120);
	});
});

describe('jpegPreviewFromBytes', () => {
	it('converts a PNG into a JPEG', async () => {
		const jpeg = await jpegPreviewFromBytes(PNG_1x1);
		expect(jpeg[0]).toBe(0xff);
		expect(jpeg[1]).toBe(0xd8);
	});
});

describe('fetchGalleryPreviewBytes', () => {
	it('uses the Cloudflare URL for public images', async () => {
		const fetchPublic = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			arrayBuffer: async () =>
				PNG_1x1.buffer.slice(PNG_1x1.byteOffset, PNG_1x1.byteOffset + PNG_1x1.byteLength)
		});
		const fetchAuthenticated = vi.fn();
		const bytes = await fetchGalleryPreviewBytes({
			path: '/api/gallery-images/file/foo.avif?prefix=gallery-images',
			restricted: false,
			apiBase: 'http://127.0.0.1:3000/api',
			fetchPublic,
			fetchAuthenticated
		});
		expect(fetchPublic).toHaveBeenCalledTimes(1);
		expect(String(fetchPublic.mock.calls[0][0])).toBe(
			'https://gallery-images.itsmillertime.dev/foo.avif?prefix=gallery-images'
		);
		expect(fetchAuthenticated).not.toHaveBeenCalled();
		expect(bytes.byteLength).toBe(PNG_1x1.byteLength);
	});

	it('skips the CDN and uses the CMS for restricted images', async () => {
		const fetchPublic = vi.fn();
		const fetchAuthenticated = vi.fn().mockResolvedValue({
			ok: true,
			headers: new Headers(),
			arrayBuffer: async () =>
				PNG_1x1.buffer.slice(PNG_1x1.byteOffset, PNG_1x1.byteOffset + PNG_1x1.byteLength)
		});
		await fetchGalleryPreviewBytes({
			path: '/api/gallery-images/file/secret.avif?prefix=gallery-images',
			restricted: true,
			apiBase: 'http://127.0.0.1:3000/api',
			fetchPublic,
			fetchAuthenticated
		});
		expect(fetchPublic).not.toHaveBeenCalled();
		expect(String(fetchAuthenticated.mock.calls[0][0])).toBe(
			'http://127.0.0.1:3000/api/gallery-images/file/secret.avif?prefix=gallery-images'
		);
	});
});

describe('suggestImageAlt', () => {
	it('posts JPEG bytes to Anthropic and returns parsed alt text', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				content: [
					{ type: 'thinking', text: 'looking' },
					{ type: 'text', text: 'Alt text: "F-16 on the ramp at dusk"' }
				]
			})
		});
		const jpeg = await jpegPreviewFromBytes(PNG_1x1);
		const result = await suggestImageAlt({
			jpegBytes: jpeg,
			albumTitle: 'Goshen Airshow',
			apiKey: 'sk-test',
			model: 'claude-sonnet-5',
			fetchFn
		});
		expect(result.alt).toBe('F-16 on the ramp at dusk');
		expect(fetchFn).toHaveBeenCalledTimes(1);
		const init = fetchFn.mock.calls[0][1] as RequestInit;
		const headers = new Headers(init.headers);
		expect(headers.get('x-api-key')).toBe('sk-test');
		expect(headers.get('anthropic-version')).toBe('2023-06-01');
		const body = JSON.parse(String(init.body)) as {
			model: string;
			temperature?: number;
			messages: {
				content: { type: string; text?: string; source?: { media_type: string; data: string } }[];
			}[];
		};
		expect(body.model).toBe('claude-sonnet-5');
		expect(body.temperature).toBeUndefined();
		expect(body.messages[0].content[0].source?.media_type).toBe('image/jpeg');
		expect(body.messages[0].content[0].source?.data?.length).toBeGreaterThan(10);
		expect(body.messages[0].content[1].text).toContain('Goshen Airshow');
	});

	it('maps 429 to a rate-limit error', async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			ok: false,
			status: 429,
			json: async () => ({ error: { message: 'rate' } })
		});
		await expect(
			suggestImageAlt({
				jpegBytes: PNG_1x1,
				apiKey: 'sk-test',
				model: 'claude-sonnet-5',
				fetchFn
			})
		).rejects.toMatchObject({ status: 429 } satisfies Partial<SuggestImageAltError>);
	});

	it('includes Anthropic error detail on a 400', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetchFn = vi.fn().mockResolvedValue({
			ok: false,
			status: 400,
			json: async () => ({
				error: {
					type: 'invalid_request_error',
					message: 'temperature is not supported for this model'
				}
			})
		});
		const err = await suggestImageAlt({
			jpegBytes: PNG_1x1,
			apiKey: 'sk-test',
			model: 'claude-sonnet-5',
			fetchFn
		}).catch((e: unknown) => e);
		expect(err).toMatchObject({
			status: 502,
			message: 'Anthropic request failed: temperature is not supported for this model'
		});
		vi.restoreAllMocks();
	});
});
