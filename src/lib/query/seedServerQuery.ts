import { writable } from 'svelte/store';
import type { QueryClient } from '@tanstack/svelte-query';

/**
 * Flips to true after PersistQueryClientProvider finishes restoring IndexedDB.
 * Page seeds must re-run after this — restore otherwise overwrites fresh SSR
 * `initialData` and can stick around for `staleTime` without refetching.
 */
export const queryPersistRestored = writable(false);

/** Write server-rendered payload into the query cache (wins over stale IDB). */
export function seedServerQueryData<T>(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	data: T | null | undefined
): void {
	if (data == null) return;
	queryClient.setQueryData(queryKey, data);
}
