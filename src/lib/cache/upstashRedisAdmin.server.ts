import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

export function getUpstashRedis(): Redis | null {
	const url = env.UPSTASH_REDIS_REST_URL;
	const token = env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) return null;
	return new Redis({ url, token });
}

function assertKeyForAdmin(key: string): void {
	if (typeof key !== 'string' || key.length === 0) {
		throw new Error('Invalid key');
	}
}

export async function scanKeysWithTtl(
	redis: Redis,
	cursor: string,
	opts: { match: string; count: number }
): Promise<{ keys: { key: string; ttl: number }[]; nextCursor: string }> {
	const [nextCursor, keyList] = await redis.scan(cursor, {
		match: opts.match,
		count: opts.count
	});
	if (keyList.length === 0) {
		return { keys: [], nextCursor };
	}
	const ttls = await Promise.all(keyList.map((k) => redis.ttl(k)));
	const keys = keyList.map((key, i) => ({ key, ttl: ttls[i] ?? -2 }));
	return { keys, nextCursor };
}

export async function peekKeyValue(redis: Redis, key: string) {
	assertKeyForAdmin(key);
	const raw = await redis.get(key);
	let text: string;
	if (raw === null) {
		text = '(nil)';
	} else if (typeof raw === 'string') {
		text = raw;
	} else {
		try {
			text = JSON.stringify(raw, null, 2);
		} catch {
			text = String(raw);
		}
	}
	return { preview: text };
}

export async function deleteCacheKey(redis: Redis, key: string) {
	assertKeyForAdmin(key);
	await redis.del(key);
}
