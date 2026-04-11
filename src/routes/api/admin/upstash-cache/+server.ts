import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import {
	deleteCacheKey,
	getUpstashRedis,
	peekKeyValue,
	scanKeysWithTtl
} from '$lib/cache/upstashRedisAdmin.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!user || !isAdminRole(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const redis = getUpstashRedis();
	if (!redis) {
		return json({ configured: false, error: 'Upstash Redis is not configured' }, { status: 503 });
	}

	const cursor = event.url.searchParams.get('cursor') ?? '0';
	const match = event.url.searchParams.get('match') ?? '*';
	const count = Math.min(200, Math.max(1, Number(event.url.searchParams.get('count')) || 40));

	const result = await scanKeysWithTtl(redis, cursor, { match, count });
	return json({ configured: true, keys: result.keys, nextCursor: String(result.nextCursor) });
};

type PostBody = { action?: string; key?: string };

export const POST: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!user || !isAdminRole(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const redis = getUpstashRedis();
	if (!redis) {
		return json({ error: 'Upstash Redis is not configured' }, { status: 503 });
	}

	let body: PostBody;
	try {
		body = (await event.request.json()) as PostBody;
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const { action, key } = body;
	if (typeof key !== 'string' || key === '') {
		return json({ error: 'key is required' }, { status: 400 });
	}

	try {
		if (action === 'peek') {
			const peek = await peekKeyValue(redis, key);
			return json(peek);
		}
		if (action === 'delete') {
			await deleteCacheKey(redis, key);
			return json({ ok: true });
		}
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Bad request';
		return json({ error: message }, { status: 400 });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};
