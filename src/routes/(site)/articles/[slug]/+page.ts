import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import {
	ARTICLE_STALE_THRESHOLD_S,
	articleIdbKey,
	type ArticleCacheData
} from '$lib/cache/articleCache';
import { browserCache } from '$lib/cache/browserCache';
import {
	fetchJson,
	isBrowserOnline,
	isCacheEntryFresh,
	scheduleBackgroundRefresh
} from '$lib/cache/offlineSwr';
import type { PageLoad } from './$types';

/** Client-only load so IndexedDB is available on revisits and soft navigations. */
export const ssr = false;

export const load: PageLoad = async ({ params, fetch, depends }) => {
	depends(`app:article:${params.slug}`);

	const slug = params.slug;
	const idbKey = articleIdbKey(slug);

	if (browser) {
		const entry = await browserCache.getEntry<ArticleCacheData>(idbKey);
		if (entry) {
			const isFresh = isCacheEntryFresh(entry.cachedAt, ARTICLE_STALE_THRESHOLD_S);

			if (!isFresh) {
				scheduleBackgroundRefresh(idbKey, async () => {
					const data = await fetchJson<ArticleCacheData>(`/api/articles/${slug}`, fetch);
					await browserCache.set(idbKey, data);
				});
			}

			return {
				article: entry.data.article,
				meta: entry.data.meta,
				_isFromCache: true,
				_cacheIsFresh: isFresh
			};
		}
	}

	if (!isBrowserOnline()) {
		throw error(
			503,
			'This article is not available offline yet. Open it once while online to cache it.'
		);
	}

	try {
		const { article, meta } = await fetchJson<ArticleCacheData>(`/api/articles/${slug}`, fetch);

		if (browser) {
			await browserCache.set(idbKey, { article, meta });
		}

		return {
			article,
			meta,
			_isFromCache: false,
			_cacheIsFresh: true
		};
	} catch (err) {
		if (browser) {
			const entry = await browserCache.getEntry<ArticleCacheData>(idbKey);
			if (entry) {
				return {
					article: entry.data.article,
					meta: entry.data.meta,
					_isFromCache: true,
					_cacheIsFresh: isCacheEntryFresh(entry.cachedAt, ARTICLE_STALE_THRESHOLD_S)
				};
			}
		}

		if (err instanceof Error && err.message === 'offline') {
			throw error(
				503,
				'This article is not available offline yet. Open it once while online to cache it.'
			);
		}

		throw err;
	}
};
