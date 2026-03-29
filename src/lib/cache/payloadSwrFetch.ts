import { cacheManager } from '$lib/cache/cache';
import { env } from '$env/dynamic/private';
import { PAYLOAD_SWR_HEADER } from '$lib/payloadSwr';

export type PayloadSwrCacheOptions = {
	/** Default stale threshold when header is `1` / `true` (seconds) */
	staleSeconds?: number;
	/** Default Redis TTL when header is `1` / `true` (seconds) */
	softTtlSeconds?: number;
};

const DEFAULT_STALE = 300;
const DEFAULT_TTL = 3600;

function upstashConfigured(): boolean {
	return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

function swrDebug(msg: string, extra?: unknown): void {
	if (env.PAYLOAD_SWR_DEBUG !== '1' && env.PAYLOAD_SWR_DEBUG !== 'true') return;
	if (extra !== undefined) console.log('[payload SWR]', msg, extra);
	else console.log('[payload SWR]', msg);
}

function getHeader(init: RequestInit | undefined, name: string): string | null {
	if (!init?.headers) return null;
	const h = init.headers;
	if (h instanceof Headers) {
		const v = h.get(name);
		return v;
	}
	const record = h as Record<string, string | undefined>;
	const lower = name.toLowerCase();
	for (const [k, v] of Object.entries(record)) {
		if (k.toLowerCase() === lower && v != null) return v;
	}
	return null;
}

/** Payload must not receive our internal opt-in header */
function withoutSwrHeader(init: RequestInit | undefined): RequestInit | undefined {
	if (!init?.headers) return init;
	const h = init.headers;
	if (h instanceof Headers) {
		const next = new Headers(h);
		next.delete(PAYLOAD_SWR_HEADER);
		return { ...init, headers: next };
	}
	const record = { ...(h as Record<string, string>) };
	delete record[PAYLOAD_SWR_HEADER];
	delete record[PAYLOAD_SWR_HEADER.toLowerCase()];
	for (const k of Object.keys(record)) {
		if (k.toLowerCase() === PAYLOAD_SWR_HEADER.toLowerCase()) delete record[k];
	}
	return { ...init, headers: record };
}

/** Per-request opt-in + optional JSON overrides for stale/ttl */
function parseSwrFromInit(
	init: RequestInit | undefined,
	defaults: PayloadSwrCacheOptions
): { enabled: boolean; staleSeconds: number; ttlSeconds: number } | null {
	const raw = getHeader(init, PAYLOAD_SWR_HEADER);
	if (raw == null || raw === '') return null;
	const trimmed = raw.trim();
	if (trimmed === '1' || trimmed.toLowerCase() === 'true') {
		return {
			enabled: true,
			staleSeconds: defaults.staleSeconds ?? DEFAULT_STALE,
			ttlSeconds: defaults.softTtlSeconds ?? DEFAULT_TTL
		};
	}
	try {
		const o = JSON.parse(trimmed) as {
			staleSeconds?: number;
			softTtlSeconds?: number;
		};
		return {
			enabled: true,
			staleSeconds: o.staleSeconds ?? defaults.staleSeconds ?? DEFAULT_STALE,
			ttlSeconds: o.softTtlSeconds ?? defaults.softTtlSeconds ?? DEFAULT_TTL
		};
	} catch {
		swrDebug('invalid x-payload-swr header, ignoring', raw);
		return null;
	}
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
	const bracket = /(?:^|&)where\[id\]\[equals\]=([^&]+)/.exec(q);
	if (bracket?.[1]) {
		try {
			return decodeURIComponent(bracket[1].replace(/\+/g, ' '));
		} catch {
			return bracket[1];
		}
	}
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

function parseWhereSlugEquals(search: string): string | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const bracket = /(?:^|&)where\[slug\]\[equals\]=([^&]+)/.exec(q);
	if (bracket?.[1]) {
		try {
			return decodeURIComponent(bracket[1].replace(/\+/g, ' '));
		} catch {
			return bracket[1];
		}
	}
	const params = new URLSearchParams(q);
	const direct = params.get('where[slug][equals]');
	if (direct != null && direct !== '') return direct;
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

/** Single-album-by-slug list query (Payload find) */
function galleryAlbumBySlugQueryParams(search: string): Record<string, string> | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(q);
	const slug = parseWhereSlugEquals(`?${q}`);
	if (slug == null || slug === '') return null;
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

	if (pathname === '/gallery-albums' || pathname === '/gallery-albums/') {
		const qp = galleryAlbumBySlugQueryParams(search);
		if (qp != null) {
			const slug = parseWhereSlugEquals(search);
			if (slug != null) {
				return cacheManager.createKey(`gallery-album/slug/${encodeURIComponent(slug)}`, qp);
			}
		}
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
		const res = await innerFetch(fullUrl, withoutSwrHeader(init));
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
 * Wrap fetch: SWR only when `x-payload-swr` is on RequestInit and URL matches gallery doc GETs.
 */
export function wrapFetchWithPayloadSwr(
	innerFetch: typeof fetch,
	baseURL: string,
	defaults: PayloadSwrCacheOptions
): typeof fetch {
	const envStale = env.PAYLOAD_SWR_STALE_SECONDS
		? Number.parseInt(env.PAYLOAD_SWR_STALE_SECONDS, 10)
		: undefined;
	const envTtl = env.PAYLOAD_SWR_TTL_SECONDS ? Number.parseInt(env.PAYLOAD_SWR_TTL_SECONDS, 10) : undefined;
	const baseDefaults: PayloadSwrCacheOptions = {
		staleSeconds:
			defaults.staleSeconds ??
			(Number.isFinite(envStale) ? envStale : DEFAULT_STALE),
		softTtlSeconds:
			defaults.softTtlSeconds ?? (Number.isFinite(envTtl) ? envTtl : DEFAULT_TTL)
	};

	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const method = (init?.method ?? 'GET').toUpperCase();
		if (method !== 'GET' || !upstashConfigured()) {
			if (method === 'GET' && !upstashConfigured()) {
				swrDebug('skip: Upstash env not set');
			}
			return innerFetch(input, withoutSwrHeader(init));
		}

		const swr = parseSwrFromInit(init, baseDefaults);
		const forwardInit = withoutSwrHeader(init);
		if (!swr?.enabled) {
			return innerFetch(input, forwardInit);
		}

		const urlStr =
			typeof input === 'string'
				? input
				: input instanceof URL
					? input.toString()
					: (input as Request).url;

		const redisKey = redisKeyForPayloadGet(urlStr, baseURL);
		if (!redisKey) {
			swrDebug('no cache key (URL not a cached gallery pattern)', urlStr.slice(0, 180));
			return innerFetch(input, forwardInit);
		}

		const rawCached = await cacheManager.get(redisKey);
		const unwrapped = unwrapCache(rawCached, swr.staleSeconds);
		if (unwrapped != null) {
			const stale = unwrapped.ageSeconds >= swr.staleSeconds;
			swrDebug(stale ? 'STALE + revalidate' : 'HIT', redisKey);
			if (stale) {
				void refreshInBackground(redisKey, urlStr, forwardInit, innerFetch, swr.ttlSeconds);
			}
			return new Response(JSON.stringify(unwrapped.data), {
				status: 200,
				headers: { 'Content-Type': 'application/json', 'X-Payload-Cache': stale ? 'STALE' : 'HIT' }
			});
		}

		const res = await innerFetch(input, forwardInit);
		if (!res.ok) return res;

		const clone = res.clone();
		const text = await clone.text();
		try {
			const body = JSON.parse(text) as unknown;
			await cacheManager.set(redisKey, wrapForCache(body), swr.ttlSeconds);
			swrDebug('MISS → SET', redisKey);
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
