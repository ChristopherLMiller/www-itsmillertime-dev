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

/** Ask the service worker to cache article detail documents (not the blog index). */
export function precacheArticlePaths(paths: Iterable<string>): void {
	const unique = [
		...new Set(
			[...paths].filter(
				(path) => path.startsWith('/articles/') && path !== '/articles/'
			)
		)
	];
	if (unique.length === 0) return;
	postToServiceWorker({ type: SW_PRECACHE_PATHS, paths: unique });
}

/** Precache article bodies linked from the listing (never the index document). */
export function precacheArticlesListing(slugs: Iterable<string | null | undefined>): void {
	precacheArticleSlugs(slugs);
}

/** Precache the open article for offline reading. */
export function precacheArticleContext(slug: string | null | undefined): void {
	if (!slug) return;
	precacheArticleSlugs([slug]);
}
