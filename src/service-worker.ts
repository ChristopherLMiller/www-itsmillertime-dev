/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `articles-offline-${version}`;
const ASSETS = [...build, ...files];

const SW_PRECACHE_ARTICLES = 'PRECACHE_ARTICLES';
const SW_PRECACHE_PATHS = 'PRECACHE_PATHS';

function articleDataPath(pathname: string): string {
	const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
	return `${normalized}/__data.json`;
}

function isArticleScopeUrl(url: URL): boolean {
	const { pathname } = url;
	if (pathname === '/articles' || pathname.startsWith('/articles/')) return true;
	if (pathname.startsWith('/api/articles/')) return true;
	if (pathname === '/api/articles-data') return true;
	if (pathname === '/api/layout-data') return true;
	return false;
}

function shouldCacheResponse(response: Response): boolean {
	if (!(response instanceof Response)) return false;
	if (response.status !== 200) return false;
	if (response.headers.get('cache-control')?.includes('no-store')) return false;
	return true;
}

async function safeCachePut(
	cache: Cache,
	key: Request | string,
	response: Response
): Promise<void> {
	if (!shouldCacheResponse(response)) return;

	try {
		await cache.put(key, response.clone());
	} catch {
		// Quota or unsupported entries should never break navigation.
	}
}

async function fetchAndCache(url: string, cache: Cache): Promise<void> {
	const request = new Request(url, { credentials: 'same-origin' });
	if (await cache.match(request)) return;

	try {
		const response = await fetch(request);
		await safeCachePut(cache, request, response);
	} catch {
		// Best-effort precache.
	}
}

async function precacheArticleSlugs(slugs: string[]): Promise<void> {
	const cache = await caches.open(CACHE);
	const origin = sw.location.origin;

	for (const slug of slugs) {
		if (!slug) continue;

		const paths = [
			`/articles/${slug}`,
			`/api/articles/${slug}`,
			articleDataPath(`/articles/${slug}`)
		];

		for (const path of paths) {
			await fetchAndCache(new URL(path, origin).href, cache);
		}
	}
}

async function precacheArticlePaths(paths: string[]): Promise<void> {
	const cache = await caches.open(CACHE);
	const origin = sw.location.origin;

	for (const path of paths) {
		if (!path.startsWith('/articles')) continue;

		for (const urlPath of [path, articleDataPath(path)]) {
			await fetchAndCache(new URL(urlPath, origin).href, cache);
		}

		if (path === '/articles') {
			await fetchAndCache(new URL('/api/layout-data', origin).href, cache);
			await fetchAndCache(new URL('/api/articles-data?page=1&limit=25', origin).href, cache);
		}
	}
}

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);

			for (const asset of ASSETS) {
				try {
					await cache.add(asset);
				} catch {
					// One failed asset should not reject the whole install.
				}
			}
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
		})()
	);
});

sw.addEventListener('message', (event) => {
	const data = event.data as { type?: string; slugs?: string[]; paths?: string[] } | null;
	if (!data?.type) return;

	if (data.type === SW_PRECACHE_ARTICLES && Array.isArray(data.slugs)) {
		void precacheArticleSlugs(data.slugs);
		return;
	}

	if (data.type === SW_PRECACHE_PATHS && Array.isArray(data.paths)) {
		void precacheArticlePaths(data.paths);
	}
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin) return;

	const isAsset = ASSETS.includes(url.pathname);
	const isArticle = isArticleScopeUrl(url);

	// Only intercept app assets and article routes. Everything else uses the network normally.
	if (!isAsset && !isArticle) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			if (isAsset) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}

			try {
				const response = await fetch(event.request);

				if (!(response instanceof Response)) {
					throw new Error('invalid response from fetch');
				}

				const cacheKey = isAsset ? url.pathname : event.request;
				await safeCachePut(cache, cacheKey, response);
				return response;
			} catch (err) {
				const cacheKey = isAsset ? url.pathname : event.request;
				const cached = await cache.match(cacheKey);
				if (cached) return cached;

				if (isArticle && event.request.mode === 'navigate') {
					const articlesIndex = await cache.match(new URL('/articles', url.origin).href);
					if (articlesIndex) return articlesIndex;
				}

				throw err;
			}
		})()
	);
});

export {};
