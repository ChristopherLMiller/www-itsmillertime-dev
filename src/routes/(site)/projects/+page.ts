import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import {
	PROJECTS_STALE_THRESHOLD_S,
	projectsIdbKey,
	type ProjectsCacheData
} from '$lib/cache/projectCache';
import { browserCache } from '$lib/cache/browserCache';
import {
	fetchJson,
	isBrowserOnline,
	isCacheEntryFresh,
	scheduleBackgroundRefresh
} from '$lib/cache/offlineSwr';
import type { PageLoad } from './$types';

export const ssr = false;

export const load: PageLoad = async ({ fetch, url, depends }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 50;
	const idbKey = projectsIdbKey(page, limit);

	depends(`app:projects:${page}:${limit}`);

	if (browser) {
		const entry = await browserCache.getEntry<ProjectsCacheData>(idbKey);
		if (entry) {
			const isFresh = isCacheEntryFresh(entry.cachedAt, PROJECTS_STALE_THRESHOLD_S);

			if (!isFresh) {
				scheduleBackgroundRefresh(idbKey, async () => {
					const q = new URLSearchParams({ page: String(page), limit: String(limit) });
					const data = await fetchJson<ProjectsCacheData>(`/api/projects-data?${q}`, fetch);
					await browserCache.set(idbKey, data);
				});
			}

			return {
				projects: entry.data.projects,
				meta: entry.data.meta,
				page,
				limit,
				_isFromCache: true,
				_cacheIsFresh: isFresh
			};
		}
	}

	if (!isBrowserOnline()) {
		throw error(
			503,
			'Projects are not available offline yet. Open this page once while online to cache it.'
		);
	}

	try {
		const q = new URLSearchParams({ page: String(page), limit: String(limit) });
		const { projects, meta } = await fetchJson<ProjectsCacheData>(`/api/projects-data?${q}`, fetch);

		if (browser) {
			await browserCache.set(idbKey, { projects, meta });
		}

		return {
			projects,
			meta,
			page,
			limit,
			_isFromCache: false,
			_cacheIsFresh: true
		};
	} catch (err) {
		if (browser) {
			const entry = await browserCache.getEntry<ProjectsCacheData>(idbKey);
			if (entry) {
				return {
					projects: entry.data.projects,
					meta: entry.data.meta,
					page,
					limit,
					_isFromCache: true,
					_cacheIsFresh: isCacheEntryFresh(entry.cachedAt, PROJECTS_STALE_THRESHOLD_S)
				};
			}
		}

		if (err instanceof Error && err.message === 'offline') {
			throw error(
				503,
				'Projects are not available offline yet. Open this page once while online to cache it.'
			);
		}

		throw err;
	}
};
