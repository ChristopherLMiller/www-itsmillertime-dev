/**
 * Boot helpers so Cache Storage cannot keep a stale blog index around.
 * The one-time SW unregister lives inline in `app.html` so it runs before
 * any (possibly stale) client module hydrates over correct SSR HTML.
 */
import { browser } from '$app/environment';

function isStaleListingRequest(url: URL): boolean {
	const { pathname } = url;
	return (
		pathname === '/articles' ||
		pathname === '/articles/' ||
		pathname === '/articles/__data.json' ||
		pathname === '/articles/__data.json/' ||
		pathname === '/api/articles-data'
	);
}

/** Remove any cached blog-index documents / list API responses from Cache Storage. */
export async function purgeCachedArticlesListing(): Promise<void> {
	if (!browser || typeof caches === 'undefined') return;

	const keys = await caches.keys();
	await Promise.all(
		keys.map(async (key) => {
			const cache = await caches.open(key);
			const requests = await cache.keys();
			await Promise.all(
				requests
					.filter((req) => isStaleListingRequest(new URL(req.url)))
					.map((req) => cache.delete(req))
			);
		})
	);
}
