import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureGalleryImageTrackingOnOpen, recordGalleryImageTracking } from './client';
import { normalizeGalleryImageTracking, TRACKING_EVENT_TO_FIELD } from './types';

vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: 'test'
}));

function memoryStorage(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key) {
			return store.has(key) ? store.get(key)! : null;
		},
		key(index) {
			return [...store.keys()][index] ?? null;
		},
		removeItem(key) {
			store.delete(key);
		},
		setItem(key, value) {
			store.set(key, String(value));
		}
	};
}

const sessionStore = memoryStorage();
const localStore = memoryStorage();

function stubBrowserStorage() {
	vi.stubGlobal('sessionStorage', sessionStore);
	vi.stubGlobal('localStorage', localStore);
	sessionStore.clear();
	localStore.clear();
}

function restoreBrowserStorage() {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	sessionStore.clear();
	localStore.clear();
}

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
	beforeEach(stubBrowserStorage);
	afterEach(restoreBrowserStorage);

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
	beforeEach(stubBrowserStorage);
	afterEach(restoreBrowserStorage);

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
