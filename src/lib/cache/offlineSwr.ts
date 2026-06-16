import { browser } from '$app/environment';

export function isBrowserOnline(): boolean {
	return !browser || navigator.onLine;
}

export function isCacheEntryFresh(cachedAt: number, staleThresholdS: number): boolean {
	return Date.now() - cachedAt < staleThresholdS * 1000;
}

export type CacheLoadFlags = {
	_isFromCache: boolean;
	_cacheIsFresh: boolean;
};

const inflightRefreshes = new Map<string, Promise<void>>();

/** Run a single background refresh per key; skipped when offline. */
export function scheduleBackgroundRefresh(key: string, task: () => Promise<void>): void {
	if (!browser || !isBrowserOnline()) return;

	const existing = inflightRefreshes.get(key);
	if (existing) return;

	const run = task()
		.catch(() => {})
		.finally(() => {
			inflightRefreshes.delete(key);
		});

	inflightRefreshes.set(key, run);
}

export async function fetchJson<T>(url: string, fetchFn: typeof fetch): Promise<T> {
	if (!isBrowserOnline()) {
		throw new Error('offline');
	}

	const res = await fetchFn(url);
	if (!res.ok) {
		throw new Error(`fetch failed: ${res.status}`);
	}

	return (await res.json()) as T;
}
