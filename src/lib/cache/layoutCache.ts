import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';

/** IndexedDB keys; Upstash uses the same segments with the `payload:` prefix. */
export const LAYOUT_NAV_CACHE_KEY = 'layout:nav';
export const LAYOUT_META_CACHE_KEY = 'layout:meta';

/** @deprecated Legacy combined key — clear on read paths when encountered. */
export const LAYOUT_CACHE_KEY_LEGACY = 'layout-data';

/** Serve from cache immediately; trigger a background refresh if older than this. */
export const LAYOUT_STALE_THRESHOLD_S = 5 * 60; // 5 minutes

/** Redis EXPIRE for layout globals (nav + meta). */
export const LAYOUT_CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days

export interface LayoutCacheData {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}
