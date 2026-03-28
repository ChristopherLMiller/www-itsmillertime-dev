import { cacheManager } from '$lib/cache/cache';
import { getPayloadSDK } from '$lib/payload';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NAV_CACHE_KEY = 'layout:nav';
const META_CACHE_KEY = 'layout:meta';
const STALE_THRESHOLD_S = 300; // 5 minutes

export interface LayoutApiResponse {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}

async function fetchNavigationFromCMS(): Promise<SiteNavigation> {
	const sdk = getPayloadSDK();

	const nav = await sdk.findGlobal({ slug: 'site-navigation', depth: 1, draft: true });

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

	return navigation;
}

async function fetchSiteMetaFromCMS(): Promise<SiteMeta> {
	const sdk = getPayloadSDK();
	return sdk.findGlobal({ slug: 'site-meta', depth: 1 });
}

async function refreshNavigationInBackground(): Promise<void> {
	try {
		const navigation = await fetchNavigationFromCMS();
		await cacheManager.set(cacheManager.createKey(NAV_CACHE_KEY), navigation);
	} catch (err) {
		console.error('[layout-data] Navigation background refresh failed:', err);
	}
}

async function refreshSiteMetaInBackground(): Promise<void> {
	try {
		const siteMeta = await fetchSiteMetaFromCMS();
		await cacheManager.set(cacheManager.createKey(META_CACHE_KEY), siteMeta);
	} catch (err) {
		console.error('[layout-data] Site meta background refresh failed:', err);
	}
}

export const GET: RequestHandler = async () => {
	const navCacheKey = cacheManager.createKey(NAV_CACHE_KEY);
	const metaCacheKey = cacheManager.createKey(META_CACHE_KEY);

	const [cachedNavigation, cachedSiteMeta] = await Promise.all([
		cacheManager.get(navCacheKey),
		cacheManager.get(metaCacheKey)
	]);

	if (cachedNavigation && cachedSiteMeta) {
		const [isNavStale, isMetaStale] = await Promise.all([
			cacheManager.isCacheStale(navCacheKey, STALE_THRESHOLD_S),
			cacheManager.isCacheStale(metaCacheKey, STALE_THRESHOLD_S)
		]);

		if (isNavStale) {
			// Serve immediately, refresh navigation in background
			refreshNavigationInBackground().catch(() => {});
		}

		if (isMetaStale) {
			// Serve immediately, refresh site meta in background
			refreshSiteMetaInBackground().catch(() => {});
		}

		return json(
			{
				navigation: cachedNavigation as SiteNavigation,
				siteMeta: cachedSiteMeta as SiteMeta
			},
			{ headers: { 'X-Cache': 'HIT' } }
		);
	}

	if (cachedNavigation) {
		const isNavStale = await cacheManager.isCacheStale(navCacheKey, STALE_THRESHOLD_S);
		if (isNavStale) {
			refreshNavigationInBackground().catch(() => {});
		}
	}

	if (cachedSiteMeta) {
		const isMetaStale = await cacheManager.isCacheStale(metaCacheKey, STALE_THRESHOLD_S);
		if (isMetaStale) {
			refreshSiteMetaInBackground().catch(() => {});
		}
	}

	// Partial/full cache miss – fetch only missing pieces fresh
	const [navigation, siteMeta] = await Promise.all([
		cachedNavigation
			? Promise.resolve(cachedNavigation as SiteNavigation)
			: fetchNavigationFromCMS(),
		cachedSiteMeta ? Promise.resolve(cachedSiteMeta as SiteMeta) : fetchSiteMetaFromCMS()
	]);

	const writes: Promise<void>[] = [];
	if (!cachedNavigation) {
		writes.push(cacheManager.set(navCacheKey, navigation));
	}
	if (!cachedSiteMeta) {
		writes.push(cacheManager.set(metaCacheKey, siteMeta));
	}
	if (writes.length > 0) {
		await Promise.all(writes);
	}

	return json({ navigation, siteMeta }, { headers: { 'X-Cache': 'MISS' } });
};
