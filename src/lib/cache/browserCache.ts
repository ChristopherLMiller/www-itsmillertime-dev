/**
 * Browser-side IndexedDB cache with TTL and stale-while-revalidate support.
 *
 * All entries carry a schemaVersion so bumping SCHEMA_VERSION automatically
 * invalidates every previously cached entry without needing a DB migration.
 */

const DB_NAME = 'swr-cache';
const STORE_NAME = 'entries';
const IDB_VERSION = 1;
const SCHEMA_VERSION = 1;

interface IDBCacheEntry<T> {
	key: string;
	data: T;
	cachedAt: number; // Unix timestamp (ms)
	schemaVersion: number;
}

export interface CacheEntryMeta<T> {
	data: T;
	cachedAt: number;
}

// Lazily opened – reused for the lifetime of the page.
let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, IDB_VERSION);

		req.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};

		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function getDB(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = openDatabase().catch((err) => {
			// Reset so the next call retries instead of re-throwing the same rejected promise.
			dbPromise = null;
			throw err;
		});
	}
	return dbPromise;
}

export const browserCache = {
	/**
	 * Returns the cached value, or null if the entry is missing or schema-stale.
	 */
	async get<T>(key: string): Promise<T | null> {
		const entry = await this.getEntry<T>(key);
		return entry ? entry.data : null;
	},

	/**
	 * Returns the full entry (data + cachedAt) so the caller can check freshness
	 * without a second round-trip to IDB. Returns null on miss or schema mismatch.
	 */
	async getEntry<T>(key: string): Promise<CacheEntryMeta<T> | null> {
		try {
			const db = await getDB();
			return new Promise((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const req = tx.objectStore(STORE_NAME).get(key);
				req.onsuccess = () => {
					const row = req.result as IDBCacheEntry<T> | undefined;
					if (!row || row.schemaVersion !== SCHEMA_VERSION) {
						resolve(null);
						return;
					}
					resolve({ data: row.data, cachedAt: row.cachedAt });
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return null;
		}
	},

	async set<T>(key: string, data: T): Promise<void> {
		try {
			const db = await getDB();
			return new Promise((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const entry: IDBCacheEntry<T> = {
					key,
					data,
					cachedAt: Date.now(),
					schemaVersion: SCHEMA_VERSION
				};
				const req = tx.objectStore(STORE_NAME).put(entry);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			// IDB may be unavailable (e.g. Firefox private mode, storage quota exceeded).
		}
	},

	async clear(key: string): Promise<void> {
		try {
			const db = await getDB();
			return new Promise((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const req = tx.objectStore(STORE_NAME).delete(key);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			// Silently ignore – if IDB is unavailable the cache is effectively empty anyway.
		}
	},

	/**
	 * Returns true when the cached entry exists AND is younger than maxAgeSeconds.
	 */
	async isFresh(key: string, maxAgeSeconds: number): Promise<boolean> {
		const entry = await this.getEntry(key);
		if (!entry) return false;
		return Date.now() - entry.cachedAt < maxAgeSeconds * 1000;
	}
};

export const LAYOUT_CACHE_KEY = 'layout-data';

/** Serve from cache immediately; trigger a background refresh if older than this. */
export const LAYOUT_STALE_THRESHOLD_S = 5 * 60; // 5 minutes
