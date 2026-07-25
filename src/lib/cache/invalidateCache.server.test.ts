import { describe, expect, it } from 'vitest';

// Pure parsing helpers are inline in the route; smoke-test key segment helpers here via imports.
import { articleRedisKey, articlesListCacheKey } from '$lib/cache/articleCache';
import { LAYOUT_META_CACHE_KEY, LAYOUT_NAV_CACHE_KEY } from '$lib/cache/layoutCache';

describe('cache key shapes used by invalidation', () => {
	it('builds article redis segment from id', () => {
		expect(articleRedisKey(42)).toBe('article:42');
	});

	it('builds articles list segment', () => {
		expect(
			articlesListCacheKey({
				sort: '-publishedAt',
				page: 1,
				limit: 25,
				category: '',
				tag: ''
			})
		).toBe('articles:list:sort:-publishedAt:page:1:limit:25:category:_:tag:_');
	});

	it('exposes layout key segments', () => {
		expect(LAYOUT_NAV_CACHE_KEY).toBe('layout:nav');
		expect(LAYOUT_META_CACHE_KEY).toBe('layout:meta');
	});
});
