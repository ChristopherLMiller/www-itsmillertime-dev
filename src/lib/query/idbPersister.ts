/**
 * IndexedDB-backed async storage persister for TanStack Query.
 *
 * The whole query cache is serialized to a single IndexedDB record so that
 * previously fetched content (articles, projects, layout globals) is available
 * instantly on the next visit and while offline.
 */
import { browser } from '$app/environment';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { AsyncStorage, Persister } from '@tanstack/svelte-query-persist-client';

const DB_NAME = 'tanstack-query-cache';
const STORE_NAME = 'query-cache';
const IDB_VERSION = 1;

/** Single record key inside the object store; also the persistOptions cache buster prefix. */
export const QUERY_CACHE_STORAGE_KEY = 'itsmillertime-query-cache';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, IDB_VERSION);
		req.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
		req.onsuccess = () => {
			const db = req.result;
			db.onversionchange = () => {
				db.close();
				dbPromise = null;
			};
			resolve(db);
		};
		req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
		req.onblocked = () => reject(new Error('IndexedDB open blocked (close other tabs)'));
	});
}

function getDb(): Promise<IDBDatabase> {
	if (!dbPromise) {
		dbPromise = openDatabase().catch((err) => {
			dbPromise = null;
			throw err;
		});
	}
	return dbPromise;
}

function idbGet(key: string): Promise<string | null> {
	return getDb().then(
		(db) =>
			new Promise<string | null>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const req = tx.objectStore(STORE_NAME).get(key);
				req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
				req.onerror = () => reject(req.error);
			})
	);
}

function idbSet(key: string, value: string): Promise<void> {
	return getDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const req = tx.objectStore(STORE_NAME).put(value, key);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			})
	);
}

function idbDelete(key: string): Promise<void> {
	return getDb().then(
		(db) =>
			new Promise<void>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const req = tx.objectStore(STORE_NAME).delete(key);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			})
	);
}

/** AsyncStorage backed by IndexedDB (browser only). */
const idbStorage: AsyncStorage<string> = {
	getItem: (key) => idbGet(key),
	setItem: (key, value) => idbSet(key, value),
	removeItem: (key) => idbDelete(key)
};

/** For admin/debug UI. */
export const QUERY_CACHE_DB_NAME = DB_NAME;
export const QUERY_CACHE_STORE_NAME = STORE_NAME;

/** Read the raw persisted query-cache blob (parsed JSON) for inspection. */
export async function readPersistedQueryCache(): Promise<unknown> {
	if (!browser) return null;
	const raw = await idbGet(QUERY_CACHE_STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

/** Delete the persisted query cache entirely (offline data reset). */
export async function clearPersistedQueryCache(): Promise<void> {
	if (!browser) return;
	await idbDelete(QUERY_CACHE_STORAGE_KEY);
}

/**
 * Build the persister. On the server there is no IndexedDB, so an in-memory
 * no-op storage is used and nothing is persisted.
 */
export function createIdbPersister(): Persister {
	const noopStorage: AsyncStorage<string> = {
		getItem: () => Promise.resolve(null),
		setItem: () => Promise.resolve(),
		removeItem: () => Promise.resolve()
	};

	return createAsyncStoragePersister({
		storage: browser ? idbStorage : noopStorage,
		key: QUERY_CACHE_STORAGE_KEY,
		throttleTime: 1000
	});
}
