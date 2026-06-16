import { cacheManager } from '$lib/cache/cache';
import {
	normalizeProjectsQuery,
	PROJECTS_CACHE_TTL_S,
	PROJECTS_STALE_THRESHOLD_S,
	projectsListCacheKey,
	type ProjectsCacheData,
	type ProjectsListMeta
} from '$lib/cache/projectCache';
import { unwrapSwrCache, wrapForSwrCache } from '$lib/cache/payloadSwrCore';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Project } from '$lib/types/payload-types';

type CachedProjectsList = {
	data: ProjectsCacheData;
	isStale: boolean;
};

async function getCachedProjectsList(redisKey: string): Promise<CachedProjectsList | null> {
	const raw = await cacheManager.get(redisKey);
	const unwrapped = unwrapSwrCache(raw, PROJECTS_STALE_THRESHOLD_S);
	if (!unwrapped) return null;

	const payload = unwrapped.data as ProjectsCacheData;
	if (!payload?.projects || !Array.isArray(payload.projects) || !payload.meta) return null;

	return {
		data: payload,
		isStale: unwrapped.ageSeconds >= PROJECTS_STALE_THRESHOLD_S
	};
}

async function fetchProjectsFromCMS(page: number, limit: number): Promise<ProjectsCacheData> {
	const sdk = getPayloadSDK();
	const { docs: projects, ...meta } = await sdk.find({
		collection: 'projects',
		limit,
		page,
		sort: '-createdAt',
		depth: 2,
		where: {
			_status: { not_equals: 'draft' }
		}
	});

	return {
		projects: projects as Project[],
		meta: meta as ProjectsListMeta
	};
}

async function refreshProjectsInBackground(
	page: number,
	limit: number,
	redisKey: string
): Promise<void> {
	try {
		const payload = await fetchProjectsFromCMS(page, limit);
		await cacheManager.set(redisKey, wrapForSwrCache(payload), PROJECTS_CACHE_TTL_S);
	} catch (err) {
		console.error('[projects-cache] Background refresh failed:', err);
	}
}

export type ProjectsPageDataResult = ProjectsCacheData & {
	cacheStatus: 'HIT' | 'MISS';
	page: number;
	limit: number;
};

export async function loadProjectsPageData(
	pageRaw: number,
	limitRaw: number
): Promise<ProjectsPageDataResult> {
	const { page, limit } = normalizeProjectsQuery(pageRaw, limitRaw);
	const redisKey = cacheManager.createKey(projectsListCacheKey(page, limit));
	const cached = await getCachedProjectsList(redisKey);

	if (cached) {
		if (cached.isStale) {
			refreshProjectsInBackground(page, limit, redisKey).catch(() => {});
		}
		return {
			...cached.data,
			page,
			limit,
			cacheStatus: 'HIT'
		};
	}

	const payload = await fetchProjectsFromCMS(page, limit);
	await cacheManager.set(redisKey, wrapForSwrCache(payload), PROJECTS_CACHE_TTL_S);

	return {
		...payload,
		page,
		limit,
		cacheStatus: 'MISS'
	};
}
