import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { loadSession } from '$lib/auth/loadSession';
import {
	browserCache,
	LAYOUT_CACHE_KEY_LEGACY,
	LAYOUT_META_CACHE_KEY,
	LAYOUT_NAV_CACHE_KEY,
	LAYOUT_STALE_THRESHOLD_S
} from '$lib/cache/browserCache';
import type { LayoutCacheData } from '$lib/cache/layoutCache';
import {
	fetchJson,
	isBrowserOnline,
	isCacheEntryFresh,
	scheduleBackgroundRefresh
} from '$lib/cache/offlineSwr';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import type { LayoutLoad } from './$types';

export type { LayoutCacheData };

export const load: LayoutLoad = async (event) => {
	event.depends('app:layout');

	const request = 'request' in event ? (event.request as Request) : undefined;
	const session = await loadSession(event.fetch, request);

	if (browser) {
		void browserCache.clear(LAYOUT_CACHE_KEY_LEGACY);

		const [navEntry, metaEntry] = await Promise.all([
			browserCache.getEntry<SiteNavigation>(LAYOUT_NAV_CACHE_KEY),
			browserCache.getEntry<SiteMeta>(LAYOUT_META_CACHE_KEY)
		]);

		if (navEntry && metaEntry) {
			const navFresh = isCacheEntryFresh(navEntry.cachedAt, LAYOUT_STALE_THRESHOLD_S);
			const metaFresh = isCacheEntryFresh(metaEntry.cachedAt, LAYOUT_STALE_THRESHOLD_S);
			const isFresh = navFresh && metaFresh;

			if (!isFresh) {
				scheduleBackgroundRefresh('app:layout', async () => {
					const layout = await fetchJson<LayoutCacheData>('/api/layout-data', event.fetch);
					await Promise.all([
						browserCache.set(LAYOUT_NAV_CACHE_KEY, layout.navigation),
						browserCache.set(LAYOUT_META_CACHE_KEY, layout.siteMeta)
					]);
				});
			}

			return {
				navigation: navEntry.data,
				siteMeta: metaEntry.data,
				session,
				_isFromCache: true,
				_cacheIsFresh: isFresh
			};
		}
	}

	if (!isBrowserOnline()) {
		throw error(
			503,
			'Site navigation is not available offline yet. Visit any page once while online to cache it.'
		);
	}

	try {
		const { navigation, siteMeta } = await fetchJson<LayoutCacheData>(
			'/api/layout-data',
			event.fetch
		);

		if (browser) {
			await Promise.all([
				browserCache.set(LAYOUT_NAV_CACHE_KEY, navigation),
				browserCache.set(LAYOUT_META_CACHE_KEY, siteMeta)
			]);
		}

		return {
			navigation,
			siteMeta,
			session,
			_isFromCache: false,
			_cacheIsFresh: true
		};
	} catch (err) {
		if (browser) {
			const [navEntry, metaEntry] = await Promise.all([
				browserCache.getEntry<SiteNavigation>(LAYOUT_NAV_CACHE_KEY),
				browserCache.getEntry<SiteMeta>(LAYOUT_META_CACHE_KEY)
			]);

			if (navEntry && metaEntry) {
				const navFresh = isCacheEntryFresh(navEntry.cachedAt, LAYOUT_STALE_THRESHOLD_S);
				const metaFresh = isCacheEntryFresh(metaEntry.cachedAt, LAYOUT_STALE_THRESHOLD_S);
				return {
					navigation: navEntry.data,
					siteMeta: metaEntry.data,
					session,
					_isFromCache: true,
					_cacheIsFresh: navFresh && metaFresh
				};
			}
		}

		if (err instanceof Error && err.message === 'offline') {
			throw error(
				503,
				'Site navigation is not available offline yet. Visit any page once while online to cache it.'
			);
		}

		throw err;
	}
};
