import { writable } from 'svelte/store';

/**
 * Page-level SEO meta override.
 *
 * Dynamic routes still publish resolved meta here after TanStack Query updates
 * so the shared `Meta` component can prefer it over `page.data.meta`. Page
 * `load` functions must also return top-level `meta` for correct SSR tags.
 */
export const pageMetaOverride = writable<Record<string, unknown> | null>(null);
