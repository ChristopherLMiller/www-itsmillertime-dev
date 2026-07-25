import {
	invalidateCacheForCollection,
	invalidateCacheForCollections,
	type CacheInvalidationDoc
} from '$lib/cache/invalidateCache.server';
import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Payload (or other CMS) webhook target.
 *
 * Auth: `Authorization: Bearer <CACHE_WEBHOOK_SECRET>` or header `x-cache-webhook-secret`.
 *
 * Accepted bodies (flexible):
 * - `{ "collection": "posts", "doc": { "id": 42, "slug": "…" }, "operation": "update" }`
 * - `{ "collection": "posts", "id": 42 }`
 * - `{ "events": [ { "collection": "posts", "doc": { "id": 1 } } ] }`
 */
function assertAuthorized(request: Request): void {
	const secret = env.CACHE_WEBHOOK_SECRET?.trim();
	if (!secret) {
		throw error(503, 'CACHE_WEBHOOK_SECRET is not configured');
	}

	const headerSecret = request.headers.get('x-cache-webhook-secret')?.trim();
	const auth = request.headers.get('authorization');
	const bearer =
		auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;

	if (headerSecret !== secret && bearer !== secret) {
		throw error(401, 'Unauthorized');
	}
}

function asDoc(value: unknown): CacheInvalidationDoc | null {
	if (!value || typeof value !== 'object') return null;
	const obj = value as Record<string, unknown>;
	const id = obj.id;
	const slug = obj.slug;
	return {
		id: typeof id === 'string' || typeof id === 'number' ? id : null,
		slug: typeof slug === 'string' ? slug : null
	};
}

function collectionFromEventName(event: unknown): string {
	if (typeof event !== 'string' || !event) return '';
	// e.g. "posts.update" | "posts.afterChange"
	const [collection] = event.split('.');
	return collection ?? '';
}

function parseEvents(body: unknown): { collection: string; doc?: CacheInvalidationDoc | null }[] {
	if (!body || typeof body !== 'object') {
		throw error(400, 'Invalid JSON body');
	}

	const root = body as Record<string, unknown>;

	if (Array.isArray(root.events)) {
		return root.events
			.filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
			.map((e) => ({
				collection: String(
					e.collection ?? e.relationTo ?? collectionFromEventName(e.event) ?? ''
				),
				doc: asDoc(e.doc ?? e.data ?? e)
			}))
			.filter((e) => e.collection.length > 0);
	}

	const collection = String(
		root.collection ?? root.relationTo ?? collectionFromEventName(root.event) ?? ''
	);
	if (!collection) {
		throw error(400, 'collection is required');
	}

	return [
		{
			collection,
			doc: asDoc(root.doc ?? root.data) ?? {
				id: typeof root.id === 'string' || typeof root.id === 'number' ? root.id : null,
				slug: typeof root.slug === 'string' ? root.slug : null
			}
		}
	];
}

export const POST: RequestHandler = async ({ request }) => {
	assertAuthorized(request);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const events = parseEvents(body);
	if (events.length === 0) {
		throw error(400, 'No invalidation events found');
	}

	const results =
		events.length === 1
			? [await invalidateCacheForCollection(events[0].collection, events[0].doc)]
			: await invalidateCacheForCollections(events);

	const deletedCount = results.reduce((n, r) => n + r.deleted.length, 0);

	return json({
		ok: true,
		deletedCount,
		results
	});
};
