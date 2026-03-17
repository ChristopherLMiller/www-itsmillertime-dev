import { browser } from '$app/environment';
import { browserCache, LAYOUT_CACHE_KEY, LAYOUT_STALE_THRESHOLD_S } from '$lib/cache/browserCache';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import type { LayoutLoad } from './$types';

export interface LayoutCacheData {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}

export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('app:layout');

	// On the client, serve from localStorage immediately if fresh enough.
	// A background refresh (triggered in +layout.svelte) will update the cache
	// silently if the entry is stale.
	if (browser) {
		const cached = browserCache.get<LayoutCacheData>(LAYOUT_CACHE_KEY);
		if (cached) {
			const isFresh = browserCache.isFresh(LAYOUT_CACHE_KEY, LAYOUT_STALE_THRESHOLD_S);
			return {
				navigation: cached.navigation,
				siteMeta: cached.siteMeta,
				session: data.session,
				_isFromCache: true,
				_cacheIsFresh: isFresh
			};
		}
	}

	// Fetch from the server-side cached endpoint.
	// On the server, SvelteKit's enhanced fetch routes this to the local handler
	// which applies Redis-backed stale-while-revalidate caching.
	// On the client (cache miss), this goes over the network to the same endpoint.
	const res = await fetch('/api/layout-data');
	if (!res.ok) {
		throw new Error(`Failed to load layout data: ${res.status}`);
	}
	const { navigation, siteMeta } = (await res.json()) as LayoutCacheData;

	return {
		navigation,
		siteMeta,
		session: data.session,
		_isFromCache: false,
		_cacheIsFresh: true
	};
};
