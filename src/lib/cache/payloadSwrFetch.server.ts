/**
 * Server-only: wraps Payload SDK fetch with Upstash SWR. Do not import from universal code.
 */
import { cacheManager } from '$lib/cache/cache';
import {
	createPayloadSwrFetch,
	DEFAULT_STALE,
	DEFAULT_TTL
} from '$lib/cache/payloadSwrCore';
import { payloadSwrKeyResolvers } from '$lib/cache/payloadSwrRules.server';
import { env } from '$env/dynamic/private';

export type PayloadSwrFetchDefaults = {
	staleSeconds?: number;
	softTtlSeconds?: number;
};

export function wrapFetchWithPayloadSwr(
	innerFetch: typeof fetch,
	baseURL: string,
	explicitDefaults?: PayloadSwrFetchDefaults
): typeof fetch {
	const envStale = env.PAYLOAD_SWR_STALE_SECONDS
		? Number.parseInt(env.PAYLOAD_SWR_STALE_SECONDS, 10)
		: undefined;
	const envTtl = env.PAYLOAD_SWR_TTL_SECONDS ? Number.parseInt(env.PAYLOAD_SWR_TTL_SECONDS, 10) : undefined;

	const defaultStaleSeconds =
		explicitDefaults?.staleSeconds ??
		(Number.isFinite(envStale) ? envStale! : DEFAULT_STALE);
	const defaultTtlSeconds =
		explicitDefaults?.softTtlSeconds ??
		(Number.isFinite(envTtl) ? envTtl! : DEFAULT_TTL);

	const debug =
		env.PAYLOAD_SWR_DEBUG === '1' || env.PAYLOAD_SWR_DEBUG === 'true'
			? (msg: string, extra?: unknown) => {
					if (extra !== undefined) console.log('[payload SWR]', msg, extra);
					else console.log('[payload SWR]', msg);
				}
			: undefined;

	return createPayloadSwrFetch(innerFetch, baseURL, cacheManager, {
		defaultStaleSeconds,
		defaultTtlSeconds,
		isBackendAvailable: () =>
			Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
		keyResolvers: payloadSwrKeyResolvers,
		debug
	});
}
