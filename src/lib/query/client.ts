import { QueryClient } from '@tanstack/svelte-query';

/** Serve cached data immediately, revalidate in the background when older than this. */
export const SWR_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** How long an unused/persisted query is retained before garbage collection. */
export const SWR_GC_TIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
				refetchOnWindowFocus: true,
				refetchOnReconnect: true,
				// Content already shown from cache should refetch on mount when stale.
				refetchOnMount: true
			}
		}
	});
}
