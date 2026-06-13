import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchGalleryImageFullForPolaroid } from './gallery-image-full-fetch';

describe('fetchGalleryImageFullForPolaroid', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('returns null when the API response is not ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 404
				})
			)
		);
		await expect(fetchGalleryImageFullForPolaroid(42, false)).resolves.toBeNull();
	});

	it('reuses one in-flight fetch for the same gallery image id', async () => {
		const media = {
			id: 7,
			url: '/photo.jpg',
			alt: '',
			width: 10,
			height: 10,
			updatedAt: '',
			createdAt: ''
		};
		let fetchCalls = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn(() => {
				fetchCalls++;
				return Promise.resolve({
					ok: true,
					json: async () => media
				});
			})
		);

		const a = fetchGalleryImageFullForPolaroid(7, false);
		const b = fetchGalleryImageFullForPolaroid(7, false);
		const [outA, outB] = await Promise.all([a, b]);

		expect(fetchCalls).toBe(1);
		expect(outA?.url).toBe('/photo.jpg');
		expect(outB?.url).toBe('/photo.jpg');
	});
});
