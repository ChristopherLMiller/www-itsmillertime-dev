/**
 * Browser-side localStorage cache with TTL and stale-while-revalidate support.
 *
 * All entries are versioned so a schema change automatically invalidates old cache.
 */

const CACHE_VERSION = 1;
const KEY_PREFIX = 'swr:';

interface CacheEntry<T> {
	data: T;
	cachedAt: number; // Unix timestamp (ms)
	version: number;
}

function storageKey(key: string): string {
	return `${KEY_PREFIX}${key}`;
}

export const browserCache = {
	get<T>(key: string): T | null {
		if (typeof window === 'undefined') return null;
		try {
			const raw = localStorage.getItem(storageKey(key));
			if (!raw) return null;
			const entry: CacheEntry<T> = JSON.parse(raw);
			if (entry.version !== CACHE_VERSION) {
				localStorage.removeItem(storageKey(key));
				return null;
			}
			return entry.data;
		} catch {
			return null;
		}
	},

	set<T>(key: string, data: T): void {
		if (typeof window === 'undefined') return;
		try {
			const entry: CacheEntry<T> = {
				data,
				cachedAt: Date.now(),
				version: CACHE_VERSION
			};
			localStorage.setItem(storageKey(key), JSON.stringify(entry));
		} catch {
			// localStorage may be full or unavailable (private browsing, etc.)
		}
	},

	/**
	 * Returns true if the cached entry exists AND is younger than maxAgeSeconds.
	 */
	isFresh(key: string, maxAgeSeconds: number): boolean {
		if (typeof window === 'undefined') return false;
		try {
			const raw = localStorage.getItem(storageKey(key));
			if (!raw) return false;
			const entry: CacheEntry<unknown> = JSON.parse(raw);
			if (entry.version !== CACHE_VERSION) return false;
			return Date.now() - entry.cachedAt < maxAgeSeconds * 1000;
		} catch {
			return false;
		}
	},

	clear(key: string): void {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(storageKey(key));
	}
};

export const LAYOUT_CACHE_KEY = 'layout-data';

/** Serve from cache immediately; trigger a background refresh if older than this. */
export const LAYOUT_STALE_THRESHOLD_S = 5 * 60; // 5 minutes
