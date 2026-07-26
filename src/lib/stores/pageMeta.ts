import { writable } from 'svelte/store';

/**
 * Page-level SEO meta override.
 *
 * Client-rendered routes (e.g. articles) fetch their document via TanStack
 * Query rather than a blocking `load`, so `page.data.meta` is not populated for
 * them. Such a route can publish its resolved meta here and the shared `Meta`
 * component will prefer it over `page.data.meta`.
 */
export const pageMetaOverride = writable<Record<string, unknown> | null>(null);
