import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	__resetGalleryImageFullFetchForTests,
	fetchGalleryImageFullForPolaroid
} from './gallery-image-full-fetch';

describe('fetchGalleryImageFullForPolaroid', () => {
	afterEach(() => {
		__resetGalleryImageFullFetchForTests();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('returns null when the batch API response is not ok', async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({
					ok: false,
					status: 404
				})
			)
		);
		const p = fetchGalleryImageFullForPolaroid(42, false);
		await vi.advanceTimersByTimeAsync(50);
		await expect(p).resolves.toBeNull();
	});

	it('reuses one in-flight fetch for the same gallery image id', async () => {
		vi.useFakeTimers();
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
			vi.fn((url: string) => {
				fetchCalls++;
				expect(String(url)).toContain('/api/gallery/images/batch');
				expect(String(url)).toContain('data=basic');
				return Promise.resolve({
					ok: true,
					json: async () => ({ docs: [media] })
				});
			})
		);

		const a = fetchGalleryImageFullForPolaroid(7, false);
		const b = fetchGalleryImageFullForPolaroid(7, false);
		await vi.advanceTimersByTimeAsync(50);
		const [outA, outB] = await Promise.all([a, b]);

		expect(fetchCalls).toBe(1);
		expect(outA?.url).toBe('/photo.jpg');
		expect(outB?.url).toBe('/photo.jpg');
	});

	it('batches distinct ids into one request of up to 6', async () => {
		vi.useFakeTimers();
		const urls: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string) => {
				urls.push(String(url));
				const ids = String(url).split('ids=')[1]?.split('&')[0]?.split(',').map(Number) ?? [];
				return Promise.resolve({
					ok: true,
					json: async () => ({
						docs: ids.map((id) => ({
							id,
							url: `/photo-${id}.jpg`,
							alt: '',
							width: 10,
							height: 10,
							updatedAt: '',
							createdAt: ''
						}))
					})
				});
			})
		);

		const promises = [1, 2, 3, 4, 5, 6, 7].map((id) => fetchGalleryImageFullForPolaroid(id, false));
		// First 6 should flush immediately; 7th waits for the timer / next flush.
		await Promise.resolve();
		await vi.advanceTimersByTimeAsync(50);
		const results = await Promise.all(promises);

		expect(urls.length).toBe(2);
		expect(urls[0]).toContain('ids=1,2,3,4,5,6');
		expect(urls[0]).toContain('data=basic');
		expect(urls[1]).toContain('ids=7');
		expect(results.map((r) => r?.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('batches lightbox full fetches separately from polaroid basic', async () => {
		vi.useFakeTimers();
		const { fetchGalleryImageFullForLightbox } = await import('./gallery-image-full-fetch');
		const urls: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string) => {
				urls.push(String(url));
				return Promise.resolve({
					ok: true,
					json: async () => ({
						docs: [
							{
								id: 9,
								url: '/photo-9.jpg',
								alt: '',
								width: 10,
								height: 10,
								updatedAt: '',
								createdAt: '',
								commerce: { forSale: true, variantId: 'v1', priceUSD: 5 }
							}
						]
					})
				});
			})
		);

		const p = fetchGalleryImageFullForLightbox(9, false);
		await vi.advanceTimersByTimeAsync(50);
		const out = await p;

		expect(urls).toHaveLength(1);
		expect(urls[0]).toContain('data=full');
		expect(out?.commerce?.variantId).toBe('v1');
	});

	it('runs lightbox full fetches ahead of queued polaroid batches', async () => {
		vi.useFakeTimers();
		const { fetchGalleryImageFullForLightbox, fetchGalleryImageFullForPolaroid: fetchPolaroid } =
			await import('./gallery-image-full-fetch');
		const urls: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string) => {
				urls.push(String(url));
				return Promise.resolve({
					ok: true,
					json: async () => ({ docs: [] })
				});
			})
		);

		const polaroids = [1, 2, 3, 4, 5, 6, 7].map((id) => fetchPolaroid(id, false));
		await Promise.resolve();
		const full = fetchGalleryImageFullForLightbox(99, false);
		await vi.advanceTimersByTimeAsync(50);
		await Promise.all([...polaroids, full]);

		expect(urls.some((url) => url.includes('data=full') && url.includes('ids=99'))).toBe(true);
		const fullIndex = urls.findIndex((url) => url.includes('data=full'));
		const leftoverBasic = urls.findIndex((url) => url.includes('ids=7'));
		expect(fullIndex).toBeGreaterThanOrEqual(0);
		expect(leftoverBasic).toBeGreaterThan(fullIndex);
	});
});
