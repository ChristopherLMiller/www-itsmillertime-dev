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

/** For admin / debugging UI. */
export const BROWSER_CACHE_DB_NAME = DB_NAME;
export const BROWSER_CACHE_STORE_NAME = STORE_NAME;
export const BROWSER_CACHE_SCHEMA_VERSION = SCHEMA_VERSION;

export function isIndexedDbSupported(): boolean {
	return typeof indexedDB !== 'undefined';
}

export type IndexedDbProbeResult = {
	ok: boolean;
	error?: string;
};

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

/** Raw row from IndexedDB for inspection (includes stale schema rows). */
export interface IdbCacheRow {
	key: string;
	cachedAt: number;
	schemaVersion: number;
	data: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function resetDbConnection(): void {
	dbPromise = null;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!isIndexedDbSupported()) {
			reject(new Error('IndexedDB is not available in this browser context.'));
			return;
		}

		const req = indexedDB.open(DB_NAME, IDB_VERSION);

		req.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'key' });
			}
		};

		req.onsuccess = () => {
			const db = req.result;
			db.onversionchange = () => {
				db.close();
				resetDbConnection();
			};
			db.onclose = () => {
				resetDbConnection();
			};
			resolve(db);
		};
		req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
		req.onblocked = () =>
			reject(new Error('IndexedDB open blocked (close other tabs using this site)'));
	});
}

function getDB(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = openDatabase().catch((err) => {
			dbPromise = null;
			throw err;
		});
	}
	return dbPromise;
}

export const browserCache = {
	async probe(): Promise<IndexedDbProbeResult> {
		if (!isIndexedDbSupported()) {
			return { ok: false, error: 'IndexedDB is not available in this browser context.' };
		}

		try {
			const db = await getDB();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readonly');
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
				tx.objectStore(STORE_NAME).count();
			});
			return { ok: true };
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : 'IndexedDB could not be opened'
			};
		}
	},

	async get<T>(key: string): Promise<T | null> {
		const entry = await this.getEntry<T>(key);
		return entry ? entry.data : null;
	},

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

	async set<T>(key: string, data: T): Promise<boolean> {
		try {
			const db = await getDB();
			await new Promise<void>((resolve, reject) => {
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
			return true;
		} catch {
			return false;
		}
	},

	async clear(key: string): Promise<void> {
		try {
			const db = await getDB();
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const req = tx.objectStore(STORE_NAME).delete(key);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			// Silently ignore – if IDB is unavailable the cache is effectively empty anyway.
		}
	},

	async listAllEntries(): Promise<IdbCacheRow[]> {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			const out: IdbCacheRow[] = [];
			const tx = db.transaction(STORE_NAME, 'readonly');
			const req = tx.objectStore(STORE_NAME).openCursor();
			req.onsuccess = () => {
				const cursor = req.result;
				if (!cursor) {
					out.sort((a, b) => a.key.localeCompare(b.key));
					resolve(out);
					return;
				}
				const row = cursor.value as IDBCacheEntry<unknown>;
				out.push({
					key: row.key,
					cachedAt: row.cachedAt,
					schemaVersion: row.schemaVersion,
					data: row.data
				});
				cursor.continue();
			};
			req.onerror = () => reject(req.error ?? new Error('IndexedDB cursor failed'));
		});
	},

	async isFresh(key: string, maxAgeSeconds: number): Promise<boolean> {
		const entry = await this.getEntry(key);
		if (!entry) return false;
		return Date.now() - entry.cachedAt < maxAgeSeconds * 1000;
	}
};

export {
	LAYOUT_CACHE_KEY_LEGACY,
	LAYOUT_META_CACHE_KEY,
	LAYOUT_NAV_CACHE_KEY,
	LAYOUT_STALE_THRESHOLD_S
} from '$lib/cache/layoutCache';
