import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import {
	ARTICLE_STALE_THRESHOLD_S,
	articlesListIdbKey,
	articlesListQueryFromUrl,
	buildArticlesDataUrl,
	type ArticlesListCacheData
} from '$lib/cache/articleCache';
import { browserCache } from '$lib/cache/browserCache';
import { fetchJson, isBrowserOnline, isCacheEntryFresh } from '$lib/cache/offlineSwr';
import type { PageLoad } from './$types';

/** Client-only load so IndexedDB is available for offline revisits. */
export const ssr = false;

export const load: PageLoad = async ({ fetch, url, depends }) => {
	const query = articlesListQueryFromUrl(url);
	const idbKey = articlesListIdbKey(query);

	depends(`app:articles-list:${idbKey}`);

	async function fromIdb(isErrorFallback = false) {
		if (!browser) return null;
		const entry = await browserCache.getEntry<ArticlesListCacheData>(idbKey);
		if (!entry) return null;
		return {
			articles: entry.data.articles,
			pagination: entry.data.pagination,
			categories: entry.data.categories,
			tags: entry.data.tags,
			_isFromCache: true,
			_cacheIsFresh: isErrorFallback
				? false
				: isCacheEntryFresh(entry.cachedAt, ARTICLE_STALE_THRESHOLD_S)
		};
	}

	if (isBrowserOnline()) {
		try {
			const data = await fetchJson<ArticlesListCacheData>(buildArticlesDataUrl(query), fetch);

			if (browser) {
				await browserCache.set(idbKey, data);
			}

			return {
				articles: data.articles,
				pagination: data.pagination,
				categories: data.categories,
				tags: data.tags,
				_isFromCache: false,
				_cacheIsFresh: true
			};
		} catch (err) {
			const cached = await fromIdb(true);
			if (cached) return cached;

			if (err instanceof Error && err.message === 'offline') {
				throw error(
					503,
					'This articles view is not available offline yet. Open it once while online to cache it.'
				);
			}

			throw err;
		}
	}

	const cached = await fromIdb();
	if (cached) return cached;

	throw error(
		503,
		'This articles view is not available offline yet. Open it once while online to cache it.'
	);
};
