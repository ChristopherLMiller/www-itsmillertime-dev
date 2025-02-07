import { error } from '@sveltejs/kit';
import { Redis } from '@upstash/redis';
import type { StrapiResponse } from '../types/StrapiResponse';
import { FetchFromStrapi } from './fetch';

interface CacheConfig {
	url: string;
	token: string;
	prefix?: string;
	ttl?: number;
	warmupConcurrency?: number;
}

interface FetchOptions extends RequestInit {
	skipCache?: boolean;
}

interface CacheStats {
	totalKeys: number;
	sampleKeys: string[];
	memory: {
		used: string;
		peak: string;
		fragmentation: string;
	};
	hitRate: {
		total: number;
		hits: number;
		misses: number;
		rate: number;
	};
	keysByPrefix: Record<string, number>;
	avgTTL: number;
	oldestKey: {
		key: string;
		age: number;
	} | null;
}

interface WarmupResult {
	successful: string[];
	failed: Array<{
		url: string;
		error: string;
	}>;
	timing: {
		total: number;
		average: number;
	};
}

export class UpstashCacheManager {
	private redis: Redis;
	private prefix: string;
	private ttl: number;
	private warmupConcurrency: number;
	private stats = {
		hits: 0,
		misses: 0
	};

	constructor(config: CacheConfig) {
		this.redis = new Redis({
			url: config.url,
			token: config.token
		});
		this.prefix = config.prefix || 'cache:';
		(this.ttl = config.ttl || 3600), (this.warmupConcurrency = config.warmupConcurrency || 5);
	}

	private formatKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	/**
	 * Chunk array into smaller arrays
	 */
	private chunkArray<T>(array: T[], size: number): T[][] {
		return array.reduce((acc, _, i) => {
			if (i % size === 0) acc.push(array.slice(i, i + size));
			return acc;
		}, [] as T[][]);
	}

	/**
	 * Fetch data with caching and stats tracking
	 */
	async fetch<T>(
		url: string,
		queryParams?: unknown,
		key: string = url,
		options?: FetchOptions
	): Promise<StrapiResponse<T>> {
		const cacheKey = this.formatKey(`${url}:${key}`);

		try {
			if (!options?.skipCache) {
				const cached = await this.redis.get<StrapiResponse<T>>(cacheKey);

				if (cached) {
					this.stats.hits++;
					console.log(`Cache hit: ${cacheKey}`);
					return cached;
				}
			}

			this.stats.misses++;
			console.log(`Cache miss: ${cacheKey}`);

			const data = await FetchFromStrapi({ path: url, queryParams });

			// if its empty data, that means we have a 404 condition
			if (data.data.length === 0) {
				throw error(404, 'Data not found');
			}

			// Append the current epoch timestamp to the cache key for invalidation techniques later
			data.meta.time = Date.now();

			// Insert into the redis cache
			const pipeline = this.redis.pipeline();
			pipeline.set(cacheKey, data);
			pipeline.expire(cacheKey, this.ttl);
			await pipeline.exec();

			return data;
		} catch (error) {
			console.error('Error in fetch:', error);
			throw error;
		}
	}

	/**
	 * Cache warming methods
	 */

	/**
	 * Warm up cache with a list of URLs
	 */
	async warmCache<T>(urls: string[], options?: RequestInit): Promise<WarmupResult> {
		const startTime = Date.now();
		const results: WarmupResult = {
			successful: [],
			failed: [],
			timing: {
				total: 0,
				average: 0
			}
		};

		// Process URLs in chunks based on concurrency
		const chunks = this.chunkArray(urls, this.warmupConcurrency);

		for (const chunk of chunks) {
			await Promise.all(
				chunk.map(async (url) => {
					try {
						await this.fetch<T>(url, { ...options, skipCache: true });
						results.successful.push(url);
					} catch (error) {
						results.failed.push({
							url,
							error: error instanceof Error ? error.message : 'Unknown error'
						});
					}
				})
			);
		}

		const totalTime = Date.now() - startTime;
		results.timing = {
			total: totalTime,
			average: totalTime / urls.length
		};

		return results;
	}

	/**
	 * Warm up cache based on a pattern of existing keys
	 */
	async rewardCache<T>(pattern: string): Promise<WarmupResult> {
		const { keys } = await this.redis.scan(0, {
			match: `${this.prefix}${pattern}`,
			count: 100
		});

		const urls = keys.map((key) => key.replace(this.prefix, ''));
		return this.warmCache<T>(urls);
	}

	/**
	 * Keep cache warm by refreshing items that are about to expire
	 */
	async startWarmingService<T>(
		pattern: string,
		checkInterval: number = 300000, // 5 minutes
		expiryThreshold: number = 600 // 10 minutes
	): Promise<NodeJS.Timer> {
		return setInterval(async () => {
			const { keys } = await this.redis.scan(0, {
				match: `${this.prefix}${pattern}`,
				count: 100
			});

			for (const key of keys) {
				const ttl = await this.redis.ttl(key);
				if (ttl !== -1 && ttl < expiryThreshold) {
					const url = key.replace(this.prefix, '');
					await this.fetch<T>(url, { skipCache: true });
					console.log(`Refreshed near-expiry key: ${key}`);
				}
			}
		}, checkInterval);
	}

	/**
	 * Enhanced statistics methods
	 */
	async getDetailedStats(): Promise<CacheStats> {
		const info = await this.redis.info('memory');
		const allKeys = await this.getAllKeys();

		// Get TTL for all keys
		const ttls = await Promise.all(allKeys.map((key) => this.redis.ttl(key)));

		// Calculate average TTL
		const validTtls = ttls.filter((ttl) => ttl !== -1);
		const avgTTL =
			validTtls.length > 0 ? validTtls.reduce((a, b) => a + b, 0) / validTtls.length : 0;

		// Find oldest key
		const oldestKey =
			ttls.length > 0
				? {
						key: allKeys[ttls.indexOf(Math.min(...ttls))],
						age: Math.min(...ttls)
					}
				: null;

		// Count keys by prefix
		const keysByPrefix = allKeys.reduce(
			(acc, key) => {
				const prefixMatch = key.match(/^[^:]+:/);
				const keyPrefix = prefixMatch ? prefixMatch[0] : 'other:';
				acc[keyPrefix] = (acc[keyPrefix] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		// Parse memory info
		const memoryInfo = info.split('\r\n').reduce(
			(acc, line) => {
				const [key, value] = line.split(':');
				if (key && value) acc[key.trim()] = value.trim();
				return acc;
			},
			{} as Record<string, string>
		);

		return {
			totalKeys: allKeys.length,
			sampleKeys: allKeys.slice(0, 5),
			memory: {
				used: memoryInfo['used_memory_human'] || '0B',
				peak: memoryInfo['used_memory_peak_human'] || '0B',
				fragmentation: memoryInfo['mem_fragmentation_ratio'] || '0'
			},
			hitRate: {
				total: this.stats.hits + this.stats.misses,
				hits: this.stats.hits,
				misses: this.stats.misses,
				rate: this.stats.hits / (this.stats.hits + this.stats.misses || 1)
			},
			keysByPrefix,
			avgTTL,
			oldestKey
		};
	}

	/**
	 * Helper method to get all keys
	 */
	private async getAllKeys(): Promise<string[]> {
		const allKeys: string[] = [];
		let cursor = 0;

		do {
			const { keys, cursor: newCursor } = await this.redis.scan(cursor, {
				match: `${this.prefix}*`,
				count: 100
			});
			allKeys.push(...keys);
			cursor = newCursor;
		} while (cursor !== 0);

		return allKeys;
	}
}
