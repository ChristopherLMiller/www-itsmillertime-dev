import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import {
	ARTICLE_STALE_THRESHOLD_S,
	articleIdbKey,
	type ArticleCacheData
} from '$lib/cache/articleCache';
import { browserCache } from '$lib/cache/browserCache';
import { fetchJson, isBrowserOnline, isCacheEntryFresh } from '$lib/cache/offlineSwr';
import type { PageLoad } from './$types';

/** Client-only load so IndexedDB is available for offline revisits. */
export const ssr = false;

export const load: PageLoad = async ({ params, fetch, depends }) => {
	depends(`app:article:${params.slug}`);

	const slug = params.slug;
	const idbKey = articleIdbKey(slug);

	async function fromIdb(isErrorFallback = false) {
		if (!browser) return null;
		const entry = await browserCache.getEntry<ArticleCacheData>(idbKey);
		if (!entry) return null;
		return {
			article: entry.data.article,
			meta: entry.data.meta,
			relatedModels: entry.data.relatedModels ?? [],
			_isFromCache: true,
			_cacheIsFresh: isErrorFallback
				? false
				: isCacheEntryFresh(entry.cachedAt, ARTICLE_STALE_THRESHOLD_S)
		};
	}

	// Online: always hit the API so CMS edits (after Redis invalidation) show immediately.
	// IndexedDB is only for offline / failed-network fallback.
	if (isBrowserOnline()) {
		try {
			const { article, meta, relatedModels = [] } = await fetchJson<ArticleCacheData>(
				`/api/articles/${slug}`,
				fetch
			);

			if (browser) {
				await browserCache.set(idbKey, { article, meta, relatedModels });
			}

			return {
				article,
				meta,
				relatedModels,
				_isFromCache: false,
				_cacheIsFresh: true
			};
		} catch (err) {
			const cached = await fromIdb(true);
			if (cached) return cached;

			if (err instanceof Error && err.message === 'offline') {
				throw error(
					503,
					'This article is not available offline yet. Open it once while online to cache it.'
				);
			}

			throw err;
		}
	}

	const cached = await fromIdb();
	if (cached) return cached;

	throw error(
		503,
		'This article is not available offline yet. Open it once while online to cache it.'
	);
};
