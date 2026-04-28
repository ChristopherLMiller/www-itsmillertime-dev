import { PAYLOAD_SWR_HEADER } from '$lib/payloadSwr';

export type PayloadSwrKeyContext = {
	pathname: string;
	search: string;
	fullUrl: string;
	baseURL: string;
};

/** Return full Redis key string (including your chosen prefix), or null = do not cache this request */
export type PayloadSwrKeyResolver = (ctx: PayloadSwrKeyContext) => string | null;

export type PayloadSwrEngineConfig = {
	defaultStaleSeconds: number;
	defaultTtlSeconds: /** Redis EXPIRE */ number;
	isBackendAvailable: () => boolean;
	/** Ordered rules; first non-null key wins */
	keyResolvers: PayloadSwrKeyResolver[];
	debug?: (msg: string, extra?: unknown) => void;
};

const DEFAULT_STALE = 300;
const DEFAULT_TTL = 3600;

export { DEFAULT_STALE, DEFAULT_TTL };

function getHeader(init: RequestInit | undefined, name: string): string | null {
	if (!init?.headers) return null;
	const h = init.headers;
	if (h instanceof Headers) return h.get(name);
	const record = h as Record<string, string | undefined>;
	const lower = name.toLowerCase();
	for (const [k, v] of Object.entries(record)) {
		if (k.toLowerCase() === lower && v != null) return v;
	}
	return null;
}

function withoutSwrHeader(init: RequestInit | undefined): RequestInit | undefined {
	if (!init?.headers) return init;
	const h = init.headers;
	if (h instanceof Headers) {
		const next = new Headers(h);
		next.delete(PAYLOAD_SWR_HEADER);
		return { ...init, headers: next };
	}
	const record = { ...(h as Record<string, string>) };
	for (const k of Object.keys(record)) {
		if (k.toLowerCase() === PAYLOAD_SWR_HEADER.toLowerCase()) delete record[k];
	}
	return { ...init, headers: record };
}

function parseSwrFromInit(
	init: RequestInit | undefined,
	defaultStaleSeconds: number,
	defaultTtlSeconds: number,
	debug?: (msg: string, extra?: unknown) => void
): { enabled: boolean; staleSeconds: number; ttlSeconds: number } | null {
	const raw = getHeader(init, PAYLOAD_SWR_HEADER);
	if (raw == null || raw === '') return null;
	const trimmed = raw.trim();
	if (trimmed === '1' || trimmed.toLowerCase() === 'true') {
		return { enabled: true, staleSeconds: defaultStaleSeconds, ttlSeconds: defaultTtlSeconds };
	}
	try {
		const o = JSON.parse(trimmed) as { staleSeconds?: number; softTtlSeconds?: number };
		return {
			enabled: true,
			staleSeconds: o.staleSeconds ?? defaultStaleSeconds,
			ttlSeconds: o.softTtlSeconds ?? defaultTtlSeconds
		};
	} catch {
		debug?.('invalid x-payload-swr header, ignoring', raw);
		return null;
	}
}

function pathAndSearchFromPayloadUrl(
	fullUrl: string,
	baseURL: string
): PayloadSwrKeyContext | null {
	const normalizedBase = baseURL.replace(/\/$/, '');
	if (!fullUrl.startsWith(normalizedBase)) return null;
	const rest = fullUrl.slice(normalizedBase.length);
	const pathPart = rest.split('?')[0] ?? '';
	const searchPart = rest.includes('?') ? `?${rest.split('?').slice(1).join('?')}` : '';
	const pathname = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
	return { pathname, search: searchPart, fullUrl, baseURL };
}

type SwrEnvelope = { _swrAt: number; data: unknown };

function wrapForSwrCache(data: unknown): SwrEnvelope {
	return { _swrAt: Math.floor(Date.now() / 1000), data };
}

function unwrapSwrCache(
	raw: unknown,
	staleThreshold: number
): { data: unknown; ageSeconds: number } | null {
	if (raw == null || typeof raw !== 'object') return null;
	const o = raw as SwrEnvelope;
	if ('_swrAt' in o && 'data' in o && typeof o._swrAt === 'number') {
		return { data: o.data, ageSeconds: Math.floor(Date.now() / 1000) - o._swrAt };
	}
	return { data: raw, ageSeconds: staleThreshold + 1 };
}

export type SwrCacheAdapter = {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
};

/**
 * Generic stale-while-revalidate fetch wrapper (Upstash or any adapter).
 */
export function createPayloadSwrFetch(
	innerFetch: typeof fetch,
	baseURL: string,
	cache: SwrCacheAdapter,
	config: PayloadSwrEngineConfig
): typeof fetch {
	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const method = (init?.method ?? 'GET').toUpperCase();
		const forwardInit = withoutSwrHeader(init);

		if (method !== 'GET' || !config.isBackendAvailable()) {
			if (method === 'GET' && !config.isBackendAvailable()) {
				config.debug?.('skip: cache backend not configured');
			}
			return innerFetch(input, forwardInit);
		}

		const swr = parseSwrFromInit(
			init,
			config.defaultStaleSeconds,
			config.defaultTtlSeconds,
			config.debug
		);
		if (!swr?.enabled) {
			return innerFetch(input, forwardInit);
		}

		const urlStr =
			typeof input === 'string'
				? input
				: input instanceof URL
					? input.toString()
					: (input as Request).url;

		const parsed = pathAndSearchFromPayloadUrl(urlStr, baseURL);
		if (!parsed) {
			return innerFetch(input, forwardInit);
		}

		let redisKey: string | null = null;
		for (const resolver of config.keyResolvers) {
			redisKey = resolver(parsed);
			if (redisKey != null) break;
		}

		if (!redisKey) {
			config.debug?.('no cache key (no matching rule)', urlStr.slice(0, 180));
			return innerFetch(input, forwardInit);
		}

		const rawCached = await cache.get(redisKey);
		const unwrapped = unwrapSwrCache(rawCached, swr.staleSeconds);
		if (unwrapped != null) {
			const stale = unwrapped.ageSeconds >= swr.staleSeconds;
			config.debug?.(stale ? 'STALE + revalidate' : 'HIT', redisKey);
			if (stale) {
				void refreshSwrInBackground(
					redisKey,
					urlStr,
					forwardInit,
					innerFetch,
					cache,
					swr.ttlSeconds
				);
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
			await cache.set(redisKey, wrapForSwrCache(body), swr.ttlSeconds);
			config.debug?.('MISS → SET', redisKey);
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

async function refreshSwrInBackground(
	redisKey: string,
	fullUrl: string,
	init: RequestInit | undefined,
	innerFetch: typeof fetch,
	cache: SwrCacheAdapter,
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
		await cache.set(redisKey, wrapForSwrCache(body), ttlSeconds);
	} catch (e) {
		console.error('[payload SWR] background refresh failed', redisKey, e);
	}
}
