import { cacheManager } from '$lib/cache/cache';
import { getPayloadSDK } from '$lib/payload';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_KEY = 'layout:data';
const STALE_THRESHOLD_S = 300; // 5 minutes

export interface LayoutApiResponse {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}

async function fetchFromCMS(fetchFn: typeof globalThis.fetch): Promise<LayoutApiResponse> {
	const sdk = getPayloadSDK(fetchFn);

	const [nav, siteMeta] = await Promise.all([
		sdk.findGlobal({ slug: 'site-navigation', depth: 1, draft: true }),
		sdk.findGlobal({ slug: 'site-meta', depth: 1 })
	]);

	const navItems = nav.navItems
		? [...nav.navItems]
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
				.map((item) => ({
					...item,
					childNodes: item.childNodes
						? [...item.childNodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
						: item.childNodes
				}))
		: nav.navItems;

	const navigation: SiteNavigation = { ...nav, navItems };

	return { navigation, siteMeta };
}

async function refreshInBackground(fetchFn: typeof globalThis.fetch): Promise<void> {
	try {
		const data = await fetchFromCMS(fetchFn);
		await cacheManager.set(cacheManager.createKey(CACHE_KEY), data);
	} catch (err) {
		console.error('[layout-data] Background refresh failed:', err);
	}
}

export const GET: RequestHandler = async ({ fetch }) => {
	const cacheKey = cacheManager.createKey(CACHE_KEY);

	const cached = await cacheManager.get(cacheKey);
	if (cached) {
		const isStale = await cacheManager.isCacheStale(cacheKey, STALE_THRESHOLD_S);
		if (isStale) {
			// Serve immediately, refresh in background
			refreshInBackground(fetch).catch(() => {});
		}
		return json(cached as LayoutApiResponse, { headers: { 'X-Cache': 'HIT' } });
	}

	// Cache miss – fetch fresh
	const data = await fetchFromCMS(fetch);
	await cacheManager.set(cacheKey, data);

	return json(data, { headers: { 'X-Cache': 'MISS' } });
};
