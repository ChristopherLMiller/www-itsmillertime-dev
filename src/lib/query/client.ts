import { QueryClient } from '@tanstack/svelte-query';

/** Serve cached data immediately, revalidate in the background when older than this. */
export const SWR_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** How long an unused/persisted query is retained before garbage collection. */
export const SWR_GC_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Site nav + siteMeta (`layout` query) must never leave memory or IndexedDB —
 * they back chrome on every page and offline first paint.
 */
export const LAYOUT_GC_TIME_MS = Infinity;

/**
 * A fresh QueryClient per SSR request / browser session. Defaults implement the
 * stale-while-revalidate behavior: cached content paints instantly, then a
 * background refetch updates the view if the data changed.
 */
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: SWR_STALE_TIME_MS,
				gcTime: SWR_GC_TIME_MS,
				retry: 1,
				// Always revalidate on tab focus (ignore staleTime) so CMS edits show up on return.
				refetchOnWindowFocus: 'always',
				refetchOnReconnect: true,
				// Content already shown from cache should refetch on mount when stale.
				refetchOnMount: true
			}
		}
	});
}
