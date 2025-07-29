import { Redis } from '@upstash/redis';
import * as qs from 'qs-esm';

interface CacheConfig {
	url: string;
	token: string;
	prefix?: string;
	ttl?: number;
	warmupConcurrency?: number;
}

export class UpstashCache {
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

		this.prefix = config.prefix || 'cache';
		this.ttl = config.ttl || 3600;
		this.warmupConcurrency = config.warmupConcurrency || 5;
	}

	private formatKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	public createKey(endpoint: string, queryParams?: { [key: string]: any }): string {
		if (queryParams && Object.keys(queryParams).length > 0) {
			return `${this.formatKey(endpoint)}-${qs.stringify(queryParams)}`;
		} else {
			return this.formatKey(endpoint);
		}
	}

	public async exists(key: string): Promise<boolean> {
		const result = await this.redis.exists(key);
		return result > 0;
	}

	public async get(key: string): Promise<any> {
		try {
			const result = await this.redis.get(key);

			if (result) {
				this.stats.hits++;
				return result;
			}

			this.stats.misses++;
			return null;
		} catch (error) {
			console.error('Error fetching cache:', error);
			return null;
		}
	}

	public async set(key: string, value: any, ttl?: number): Promise<void> {
		try {
			const pipeline = this.redis.pipeline();
			pipeline.set(key, value);
			pipeline.expire(key, ttl || this.ttl);
			await pipeline.exec();
		} catch (error) {
			console.error('Error setting cache:', error);
		}
	}

	public async getCacheAge(key: string): Promise<number | null> {
		try {
			const ttl = await this.redis.ttl(key);
			if (ttl === -1) return null; // No expiration set
			if (ttl === -2) return null; // Key doesn't exist
			return this.ttl - ttl; // Age in seconds
		} catch (error) {
			console.error('Error getting cache age:', error);
			return null;
		}
	}

	public async isCacheStale(key: string, staleThreshold: number = 300): Promise<boolean> {
		const age = await this.getCacheAge(key);
		if (age === null) return true; // Consider non-existent or no-TTL caches as stale
		return age > staleThreshold; // Stale if older than threshold (default 5 minutes)
	}
}
