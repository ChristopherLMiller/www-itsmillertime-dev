/**
 * Client helpers for the articles offline service worker.
 */

import { browser } from '$app/environment';

const SW_PRECACHE_ARTICLES = 'PRECACHE_ARTICLES';
const SW_PRECACHE_PATHS = 'PRECACHE_PATHS';

function postToServiceWorker(message: Record<string, unknown>): void {
	if (!browser || !('serviceWorker' in navigator)) return;

	void navigator.serviceWorker.ready.then((registration) => {
		registration.active?.postMessage(message);
	});
}

/** Ask the service worker to fetch and cache article detail + API routes. */
export function precacheArticleSlugs(slugs: Iterable<string | null | undefined>): void {
	const unique = [...new Set([...slugs].filter((slug): slug is string => !!slug && slug.length > 0))];
	if (unique.length === 0) return;
	postToServiceWorker({ type: SW_PRECACHE_ARTICLES, slugs: unique });
}

/** Ask the service worker to cache listing/index documents and their data payloads. */
export function precacheArticlePaths(paths: Iterable<string>): void {
	const unique = [...new Set([...paths].filter((path) => path.startsWith('/articles')))];
	if (unique.length === 0) return;
	postToServiceWorker({ type: SW_PRECACHE_PATHS, paths: unique });
}

/** Precache listing page plus every article linked from it. */
export function precacheArticlesListing(slugs: Iterable<string | null | undefined>): void {
	precacheArticlePaths(['/articles']);
	precacheArticleSlugs(slugs);
}

/** Precache the open article and the listing for back-navigation while offline. */
export function precacheArticleContext(slug: string | null | undefined): void {
	if (!slug) return;
	precacheArticlePaths(['/articles']);
	precacheArticleSlugs([slug]);
}
