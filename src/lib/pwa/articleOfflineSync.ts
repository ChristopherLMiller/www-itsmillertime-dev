/**
 * Client helpers so CMS CRUD events can drop stale article Cache Storage entries.
 */
import { browser } from '$app/environment';

const SW_PRECACHE_ARTICLES = 'PRECACHE_ARTICLES';
const SW_PRECACHE_PATHS = 'PRECACHE_PATHS';
const SW_INVALIDATE_ARTICLES = 'INVALIDATE_ARTICLES';

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
			[...paths].filter((path) => path.startsWith('/articles/') && path !== '/articles/')
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

/** Drop cached article documents after a CMS update, then recache if still needed. */
export function invalidateCachedArticles(slugs?: Iterable<string | null | undefined>): void {
	const unique = slugs
		? [...new Set([...slugs].filter((slug): slug is string => !!slug && slug.length > 0))]
		: [];
	postToServiceWorker({ type: SW_INVALIDATE_ARTICLES, slugs: unique });
}
