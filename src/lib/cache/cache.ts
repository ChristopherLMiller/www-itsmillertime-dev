import { env } from '$env/dynamic/private';
import { UpstashCacheManager } from '../../utilities/UpstashCacheManager';

export const cacheManager = new UpstashCacheManager({
	url: env.UPSTASH_REDIS_REST_URL!,
	token: env.UPSTASH_REDIS_REST_TOKEN!,
	prefix: 'strapi:',
	ttl: 3600
});
