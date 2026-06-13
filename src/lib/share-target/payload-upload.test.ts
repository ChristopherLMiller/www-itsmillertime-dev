import { describe, expect, it, vi } from 'vitest';
import { payloadCreateUpload, altFromShareContext, isImageFile } from './payload-upload.server';

function fileLike(name: string, type?: string): File {
	return new File([], name, type ? { type } : {});
}

describe('isImageFile', () => {
	it('uses MIME prefix image/', () => {
		expect(isImageFile(fileLike('x.bin', 'image/png'))).toBe(true);
		expect(isImageFile(fileLike('x', 'application/octet-stream'))).toBe(false);
	});

	it('falls back on common extensions case-insensitively', () => {
		expect(isImageFile(fileLike('vacation.JPEG'))).toBe(true);
		expect(isImageFile(fileLike('snap.heic'))).toBe(true);
		expect(isImageFile(fileLike('note.txt'))).toBe(false);
	});
});

describe('altFromShareContext', () => {
	it('joins non-empty trimmed fields', () => {
		const alt = altFromShareContext(fileLike('x.png'), '  Hi ', '', 'example.com/foo');
		expect(alt).toBe('Hi — example.com/foo');
	});

	it('truncates beyond 500 characters with ellipsis', () => {
		const huge = 'a'.repeat(600);
		const alt = altFromShareContext(fileLike('ignored.png'), huge, '', '');
		/* 497 code units + U+2026 ellipsis — still within the 500 cap */
		expect(alt.length).toBe(498);
		expect(alt.endsWith('…')).toBe(true);
	});

	it('uses filename stem when nothing else applies', () => {
		expect(altFromShareContext(fileLike('MyPhoto.PNG'), '', '', '')).toBe('MyPhoto');
	});
});

describe('payloadCreateUpload', () => {
	it('posts form data and parses doc id', async () => {
		const innerFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ doc: { id: 99 } }), { status: 201 })
		);
		const r = await payloadCreateUpload({
			innerFetch,
			baseURL: 'https://cms.test/api/',
			collection: 'media',
			fileBody: new Blob(['x']),
			filename: 'a.png',
			payloadJson: { alt: 'a' }
		});
		expect(r).toEqual({ ok: true, id: 99 });
		const [url, init] = innerFetch.mock.calls[0];
		expect(url).toBe('https://cms.test/api/media');
		expect(init?.method).toBe('POST');
	});

	it('returns first Payload error message on non-OK', async () => {
		const innerFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ errors: [{ message: 'Bad alt' }] }), { status: 400 })
		);
		const r = await payloadCreateUpload({
			innerFetch,
			baseURL: 'https://cms.test/api',
			collection: 'gallery-images',
			fileBody: new Blob([]),
			filename: 'a.png',
			payloadJson: {}
		});
		expect(r).toEqual({ ok: false, message: 'Bad alt' });
	});
});
