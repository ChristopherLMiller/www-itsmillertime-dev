import { articleRedisKey } from '$lib/cache/articleCache';
import { LAYOUT_CACHE_KEY_LEGACY, LAYOUT_META_CACHE_KEY, LAYOUT_NAV_CACHE_KEY } from '$lib/cache/layoutCache';
import {
	deleteCacheKey,
	getUpstashRedis,
	scanKeysWithTtl
} from '$lib/cache/upstashRedisAdmin.server';
import { cacheManager } from '$lib/cache/cache';

const REDIS_PREFIX = 'payload:';

export type CacheInvalidationDoc = {
	id?: number | string | null;
	slug?: string | null;
};

export type CacheInvalidationResult = {
	collection: string;
	deleted: string[];
};

async function deleteMatchingKeys(match: string): Promise<string[]> {
	const redis = getUpstashRedis();
	if (!redis) return [];

	const deleted: string[] = [];
	let cursor = '0';
	do {
		const page = await scanKeysWithTtl(redis, cursor, { match, count: 100 });
		for (const { key } of page.keys) {
			await deleteCacheKey(redis, key);
			deleted.push(key);
		}
		cursor = page.nextCursor;
	} while (cursor !== '0');

	return deleted;
}

async function deleteExactKey(segment: string): Promise<string | null> {
	const redis = getUpstashRedis();
	if (!redis) return null;
	const key = cacheManager.createKey(segment);
	const exists = await redis.exists(key);
	if (!exists) return null;
	await deleteCacheKey(redis, key);
	return key;
}

/**
 * Drop Redis SWR entries for a Payload collection change so the next site
 * request refetches from CMS.
 */
export async function invalidateCacheForCollection(
	collection: string,
	doc?: CacheInvalidationDoc | null
): Promise<CacheInvalidationResult> {
	const deleted: string[] = [];

	switch (collection) {
		case 'posts': {
			if (doc?.id != null && doc.id !== '') {
				const key = await deleteExactKey(articleRedisKey(doc.id));
				if (key) deleted.push(key);
			}
			deleted.push(...(await deleteMatchingKeys(`${REDIS_PREFIX}articles:list:*`)));
			break;
		}
		case 'posts-categories':
		case 'posts-tags': {
			deleted.push(...(await deleteMatchingKeys(`${REDIS_PREFIX}articles:list:*`)));
			break;
		}
		case 'projects':
		case 'projects-categories':
		case 'projects-technologies': {
			deleted.push(...(await deleteMatchingKeys(`${REDIS_PREFIX}projects:list:*`)));
			break;
		}
		case 'site-meta':
		case 'site-navigation':
		case 'pages': {
			for (const segment of [LAYOUT_NAV_CACHE_KEY, LAYOUT_META_CACHE_KEY, LAYOUT_CACHE_KEY_LEGACY]) {
				const key = await deleteExactKey(segment);
				if (key) deleted.push(key);
			}
			break;
		}
		default:
			break;
	}

	return { collection, deleted: [...new Set(deleted)] };
}

export async function invalidateCacheForCollections(
	events: { collection: string; doc?: CacheInvalidationDoc | null }[]
): Promise<CacheInvalidationResult[]> {
	const results: CacheInvalidationResult[] = [];
	for (const event of events) {
		results.push(await invalidateCacheForCollection(event.collection, event.doc));
	}
	return results;
}
