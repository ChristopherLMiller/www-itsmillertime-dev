import { env } from '$env/dynamic/private';
import { UpstashCache } from './upstashCache';

export const cacheManager = new UpstashCache({
	url: env.UPSTASH_REDIS_REST_URL!,
	token: env.UPSTASH_REDIS_REST_TOKEN!,
	prefix: 'payload:',
	ttl: 3600
});
