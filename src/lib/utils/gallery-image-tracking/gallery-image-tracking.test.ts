import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureGalleryImageTrackingOnOpen, recordGalleryImageTracking } from './client';
import { normalizeGalleryImageTracking, TRACKING_EVENT_TO_FIELD } from './types';

describe('normalizeGalleryImageTracking', () => {
	it('fills missing fields with zero', () => {
		expect(normalizeGalleryImageTracking({ views: 3 })).toEqual({
			views: 3,
			downloads: 0,
			likes: 0,
			dislikes: 0,
			comments: 0,
			shares: 0
		});
	});
});

describe('TRACKING_EVENT_TO_FIELD', () => {
	it('maps events to tracking fields', () => {
		expect(TRACKING_EVENT_TO_FIELD.view).toBe('views');
		expect(TRACKING_EVENT_TO_FIELD.share).toBe('shares');
	});
});

describe('ensureGalleryImageTrackingOnOpen', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		sessionStorage.clear();
	});

	it('issues a single POST for concurrent opens of the same image', async () => {
		let fetchCalls = 0;
		vi.stubGlobal(
			'fetch',
			vi.fn(() => {
				fetchCalls += 1;
				return Promise.resolve({
					ok: true,
					json: async () => ({
						tracking: {
							views: 1,
							downloads: 0,
							likes: 0,
							dislikes: 0,
							comments: 0,
							shares: 0
						}
					})
				});
			})
		);

		const [a, b, c] = await Promise.all([
			ensureGalleryImageTrackingOnOpen(99),
			ensureGalleryImageTrackingOnOpen(99),
			ensureGalleryImageTrackingOnOpen(99)
		]);

		expect(fetchCalls).toBe(1);
		expect(a?.views).toBe(1);
		expect(b?.views).toBe(1);
		expect(c?.views).toBe(1);
	});

	it('skips a second view POST after the first open', async () => {
		const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
			const method = init?.method ?? 'GET';
			return Promise.resolve({
				ok: true,
				json: async () => ({
					tracking: {
						views: method === 'POST' ? 2 : 2,
						downloads: 0,
						likes: 0,
						dislikes: 0,
						comments: 0,
						shares: 0
					}
				})
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		await ensureGalleryImageTrackingOnOpen(42);
		await ensureGalleryImageTrackingOnOpen(42);

		const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
		const gets = fetchMock.mock.calls.filter(([, init]) => !init?.method || init.method === 'GET');
		expect(posts).toHaveLength(1);
		expect(gets).toHaveLength(0);
	});
});

describe('recordGalleryImageTracking', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		sessionStorage.clear();
		localStorage.clear();
	});

	it('does not POST a view twice in one session', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: async () => ({
					tracking: {
						views: 1,
						downloads: 0,
						likes: 0,
						dislikes: 0,
						comments: 0,
						shares: 0
					}
				})
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		await recordGalleryImageTracking(7, 'view');
		await recordGalleryImageTracking(7, 'view');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
