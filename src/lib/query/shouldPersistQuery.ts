import { defaultShouldDehydrateQuery, type Query } from '@tanstack/svelte-query';

/**
 * Persist layout + list stubs for offline/SWR, but skip full article bodies
 * (Lexical JSON) which dominate IndexedDB size and main-thread serialize cost.
 */
export function shouldPersistQuery(query: Query): boolean {
	if (!defaultShouldDehydrateQuery(query)) return false;

	const root = query.queryKey[0];
	if (root === 'article') return false;
	if (root === 'layout' || root === 'articles' || root === 'projects') return true;
	return false;
}
