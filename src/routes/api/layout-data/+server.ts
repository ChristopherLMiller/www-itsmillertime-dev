import { cacheManager } from '$lib/cache/cache';
import {
	LAYOUT_CACHE_TTL_S,
	LAYOUT_META_CACHE_KEY,
	LAYOUT_NAV_CACHE_KEY,
	LAYOUT_STALE_THRESHOLD_S
} from '$lib/cache/layoutCache';
import { unwrapSwrCache, wrapForSwrCache } from '$lib/cache/payloadSwrCore';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface LayoutApiResponse {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}

type CachedLayoutPart<T> = {
	data: T;
	isStale: boolean;
};

async function getCachedLayoutPart<T>(redisKey: string): Promise<CachedLayoutPart<T> | null> {
	const raw = await cacheManager.get(redisKey);
	const unwrapped = unwrapSwrCache(raw, LAYOUT_STALE_THRESHOLD_S);
	if (!unwrapped) return null;

	return {
		data: unwrapped.data as T,
		isStale: unwrapped.ageSeconds >= LAYOUT_STALE_THRESHOLD_S
	};
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

async function refreshNavigationInBackground(redisKey: string): Promise<void> {
	try {
		const navigation = await fetchNavigationFromCMS();
		await cacheManager.set(redisKey, wrapForSwrCache(navigation), LAYOUT_CACHE_TTL_S);
	} catch (err) {
		console.error('[layout-data] Navigation background refresh failed:', err);
	}
}

async function refreshSiteMetaInBackground(redisKey: string): Promise<void> {
	try {
		const siteMeta = await fetchSiteMetaFromCMS();
		await cacheManager.set(redisKey, wrapForSwrCache(siteMeta), LAYOUT_CACHE_TTL_S);
	} catch (err) {
		console.error('[layout-data] Site meta background refresh failed:', err);
	}
}

export const GET: RequestHandler = async () => {
	const navCacheKey = cacheManager.createKey(LAYOUT_NAV_CACHE_KEY);
	const metaCacheKey = cacheManager.createKey(LAYOUT_META_CACHE_KEY);

	const [cachedNavigation, cachedSiteMeta] = await Promise.all([
		getCachedLayoutPart<SiteNavigation>(navCacheKey),
		getCachedLayoutPart<SiteMeta>(metaCacheKey)
	]);

	if (cachedNavigation && cachedSiteMeta) {
		if (cachedNavigation.isStale) {
			refreshNavigationInBackground(navCacheKey).catch(() => {});
		}

		if (cachedSiteMeta.isStale) {
			refreshSiteMetaInBackground(metaCacheKey).catch(() => {});
		}

		return json(
			{
				navigation: cachedNavigation.data,
				siteMeta: cachedSiteMeta.data
			},
			{ headers: { 'X-Cache': 'HIT' } }
		);
	}

	if (cachedNavigation?.isStale) {
		refreshNavigationInBackground(navCacheKey).catch(() => {});
	}

	if (cachedSiteMeta?.isStale) {
		refreshSiteMetaInBackground(metaCacheKey).catch(() => {});
	}

	const [navigation, siteMeta] = await Promise.all([
		cachedNavigation
			? Promise.resolve(cachedNavigation.data)
			: fetchNavigationFromCMS(),
		cachedSiteMeta ? Promise.resolve(cachedSiteMeta.data) : fetchSiteMetaFromCMS()
	]);

	const writes: Promise<void>[] = [];
	if (!cachedNavigation) {
		writes.push(cacheManager.set(navCacheKey, wrapForSwrCache(navigation), LAYOUT_CACHE_TTL_S));
	}
	if (!cachedSiteMeta) {
		writes.push(cacheManager.set(metaCacheKey, wrapForSwrCache(siteMeta), LAYOUT_CACHE_TTL_S));
	}
	if (writes.length > 0) {
		await Promise.all(writes);
	}

	return json(
		{ navigation, siteMeta },
		{ headers: { 'X-Cache': cachedNavigation && cachedSiteMeta ? 'HIT' : 'MISS' } }
	);
};
