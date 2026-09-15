import { defaultShouldDehydrateQuery, type Query } from '@tanstack/svelte-query';

/**
 * Persist layout + list-shaped queries for offline/SWR.
 *
 * Do not persist article lists/bodies: they are SSR-seeded on every visit, and
 * keeping them in IndexedDB races with that seed. Offline article reading is
 * handled by the service worker instead.
 *
 * Do not persist full CMS page/garden/album bodies — they are large Lexical trees.
 */
export function shouldPersistQuery(query: Query): boolean {
	if (!defaultShouldDehydrateQuery(query)) return false;

	const root = query.queryKey[0];
	if (root === 'article' || root === 'articles') return false;
	if (root === 'page' || root === 'garden' || root === 'gallery') return false;
	if (
		root === 'layout' ||
		root === 'projects' ||
		root === 'models' ||
		root === 'parks' ||
		root === 'galleries' ||
		root === 'gardens'
	) {
		return true;
	}
	return false;
}
