import { defaultShouldDehydrateQuery, type Query } from '@tanstack/svelte-query';

/**
 * Persist layout + project lists for offline/SWR.
 *
 * Do not persist article lists: they are SSR-seeded on every visit, and keeping
 * them in IndexedDB races with that seed (stale sort/missing posts until staleTime).
 * Offline article reading is handled by the service worker instead.
 */
export function shouldPersistQuery(query: Query): boolean {
	if (!defaultShouldDehydrateQuery(query)) return false;

	const root = query.queryKey[0];
	if (root === 'article' || root === 'articles') return false;
	if (root === 'layout' || root === 'projects') return true;
	return false;
}
