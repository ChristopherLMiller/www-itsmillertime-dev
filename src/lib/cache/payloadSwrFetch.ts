import { cacheManager } from '$lib/cache/cache';
import { env } from '$env/dynamic/private';

export type PayloadSwrCacheOptions = {
	/** When true, eligible Payload GETs use Upstash stale-while-revalidate caching */
	enabled?: boolean;
	/** Serve cached value while older than this (seconds); triggers background refresh */
	staleSeconds?: number;
	/** Redis TTL for stored JSON (seconds) */
	softTtlSeconds?: number;
};

const DEFAULT_STALE = 300;
const DEFAULT_TTL = 3600;

function upstashConfigured(): boolean {
	return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Path + search after Payload baseURL, e.g. /gallery-albums/5 or /gallery-images?where=...
 */
function pathAndSearchFromPayloadUrl(fullUrl: string, baseURL: string): { pathname: string; search: string } | null {
	const normalizedBase = baseURL.replace(/\/$/, '');
	if (!fullUrl.startsWith(normalizedBase)) return null;
	const rest = fullUrl.slice(normalizedBase.length);
	const pathPart = rest.split('?')[0] ?? '';
	const searchPart = rest.includes('?') ? `?${rest.split('?').slice(1).join('?')}` : '';
	const pathname = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
	return { pathname, search: searchPart };
}

function parseWhereIdEquals(search: string): string | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(q);
	const direct = params.get('where[id][equals]');
	if (direct != null && direct !== '') return direct;
	const whereRaw = params.get('where');
	if (whereRaw) {
		try {
			const w = JSON.parse(whereRaw) as { id?: { equals?: number | string } };
			const eq = w?.id?.equals;
			if (eq != null && String(eq) !== '') return String(eq);
		} catch {
			/* ignore */
		}
	}
	return null;
}

/** Stable query object for gallery-images find (single id) — used in cache key */
function galleryImageFindQueryParams(search: string): Record<string, string> | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(q);
	const id = parseWhereIdEquals(`?${q}`);
	if (id == null) return null;
	if (params.get('limit') !== '1') return null;
	const page = params.get('page');
	if (page != null && page !== '1') return null;

	const out: Record<string, string> = {};
	const keys = Array.from(params.keys()).sort();
	for (const k of keys) {
		const v = params.get(k);
		if (v != null) out[k] = v;
	}
	return out;
}

/**
 * Redis key via cacheManager.createKey — stored as payload:gallery-album/{id} or
 * payload:gallery-image/{id}-<qs> for find variants.
 */
function redisKeyForPayloadGet(fullUrl: string, baseURL: string): string | null {
	const parsed = pathAndSearchFromPayloadUrl(fullUrl, baseURL);
	if (!parsed) return null;

	const { pathname, search } = parsed;

	const albumMatch = pathname.match(/^\/gallery-albums\/([^/?#]+)\/?$/);
	if (albumMatch) {
		return cacheManager.createKey(`gallery-album/${albumMatch[1]}`);
	}

	const imageById = pathname.match(/^\/gallery-images\/([^/?#]+)\/?$/);
	if (imageById) {
		const q = search.startsWith('?') && search.length > 1 ? qsFromSearch(search) : undefined;
		return q && Object.keys(q).length > 0
			? cacheManager.createKey(`gallery-image/${imageById[1]}`, q)
			: cacheManager.createKey(`gallery-image/${imageById[1]}`);
	}

	if (pathname === '/gallery-images' || pathname === '/gallery-images/') {
		const qp = galleryImageFindQueryParams(search);
		if (!qp) return null;
		const id = parseWhereIdEquals(search);
		if (id == null) return null;
		return cacheManager.createKey(`gallery-image/${id}`, qp);
	}

	return null;
}

function qsFromSearch(search: string): Record<string, string> {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(q);
	const out: Record<string, string> = {};
	for (const [k, v] of params.entries()) {
		out[k] = v;
	}
	return out;
}

type SwrEnvelope = { _swrAt: number; data: unknown };

function wrapForCache(data: unknown): SwrEnvelope {
	return { _swrAt: Math.floor(Date.now() / 1000), data };
}

function unwrapCache(raw: unknown, staleThreshold: number): { data: unknown; ageSeconds: number } | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as SwrEnvelope;
	if ('_swrAt' in o && 'data' in o && typeof o._swrAt === 'number') {
		return { data: o.data, ageSeconds: Math.floor(Date.now() / 1000) - o._swrAt };
	}
	/* legacy entries without envelope: serve once, always trigger background refresh to re-wrap */
	return { data: raw, ageSeconds: staleThreshold + 1 };
}

async function refreshInBackground(
	redisKey: string,
	fullUrl: string,
	init: RequestInit | undefined,
	innerFetch: typeof fetch,
	ttlSeconds: number
): Promise<void> {
	try {
		const res = await innerFetch(fullUrl, init);
		if (!res.ok) return;
		const text = await res.text();
		let body: unknown;
		try {
			body = JSON.parse(text) as unknown;
		} catch {
			return;
		}
		await cacheManager.set(redisKey, wrapForCache(body), ttlSeconds);
	} catch (e) {
		console.error('[payload SWR] background refresh failed', redisKey, e);
	}
}

/**
 * Opt-in: gallery-album and gallery-image document GETs use Upstash SWR.
 * Keys: payload:gallery-album/{id}, payload:gallery-image/{id} or payload:gallery-image/{id}-<query>
 */
export function wrapFetchWithPayloadSwr(
	innerFetch: typeof fetch,
	baseURL: string,
	options: PayloadSwrCacheOptions
): typeof fetch {
	const staleSeconds = options.staleSeconds ?? DEFAULT_STALE;
	const ttlSeconds = options.softTtlSeconds ?? DEFAULT_TTL;

	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const method = (init?.method ?? 'GET').toUpperCase();
		if (method !== 'GET' || !options.enabled || !upstashConfigured()) {
			return innerFetch(input, init);
		}

		const urlStr =
			typeof input === 'string'
				? input
				: input instanceof URL
					? input.toString()
					: (input as Request).url;

		const redisKey = redisKeyForPayloadGet(urlStr, baseURL);
		if (!redisKey) {
			return innerFetch(input, init);
		}

		const rawCached = await cacheManager.get(redisKey);
		const unwrapped = unwrapCache(rawCached, staleSeconds);
		if (unwrapped != null) {
			const stale = unwrapped.ageSeconds >= staleSeconds;
			if (stale) {
				void refreshInBackground(redisKey, urlStr, init, innerFetch, ttlSeconds);
			}
			return new Response(JSON.stringify(unwrapped.data), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-Payload-Cache': stale ? 'STALE' : 'HIT' }
			});
		}

		const res = await innerFetch(input, init);
		if (!res.ok) return res;

		const clone = res.clone();
		const text = await clone.text();
		try {
			const body = JSON.parse(text) as unknown;
			await cacheManager.set(redisKey, wrapForCache(body), ttlSeconds);
		} catch {
			/* not JSON */
		}
		return new Response(text, {
			status: res.status,
			statusText: res.statusText,
			headers: res.headers
		});
	};
}

/** Read opt-in flags from private env (set in deployment) */
export function getPayloadGallerySwrOptionsFromEnv(): PayloadSwrCacheOptions {
	const enabled =
		env.PAYLOAD_SWR_GALLERY === '1' ||
		env.PAYLOAD_SWR_GALLERY === 'true' ||
		env.PAYLOAD_CACHE_GALLERY === '1' ||
		env.PAYLOAD_CACHE_GALLERY === 'true';

	const staleSeconds = env.PAYLOAD_SWR_STALE_SECONDS
		? Number.parseInt(env.PAYLOAD_SWR_STALE_SECONDS, 10)
		: undefined;
	const softTtlSeconds = env.PAYLOAD_SWR_TTL_SECONDS
		? Number.parseInt(env.PAYLOAD_SWR_TTL_SECONDS, 10)
		: undefined;

	return {
		enabled,
		staleSeconds: Number.isFinite(staleSeconds) ? staleSeconds : undefined,
		softTtlSeconds: Number.isFinite(softTtlSeconds) ? softTtlSeconds : undefined
	};
}
