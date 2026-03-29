import { dev } from '$app/environment';
import { PUBLIC_PAYLOAD_API_ENDPOINT, PUBLIC_PAYLOAD_API_ENDPOINT_DEV } from '$env/static/public';
import {
	getPayloadGallerySwrOptionsFromEnv,
	wrapFetchWithPayloadSwr,
	type PayloadSwrCacheOptions
} from '$lib/cache/payloadSwrFetch';
import { PayloadSDK } from '@payloadcms/sdk';
import type { Config } from '$lib/types/payload-types';

let sdk: PayloadSDK<Config> | null = null;

/**
 * Creates a fetch wrapper that forwards better-auth session cookies to the Payload API.
 * Use when calling from server load functions so authenticated requests work.
 * In dev, rewrites better-auth cookie names to add __Secure- prefix for the backend.
 */
export function createPayloadFetch(
	fetchFn: typeof globalThis.fetch,
	request?: Request
): typeof globalThis.fetch {
	let cookieHeader = request?.headers.get('cookie');
	if (dev && cookieHeader) {
		cookieHeader = cookieHeader
			.split('; ')
			.map((c) => (c.startsWith('better-auth.') ? '__Secure-' + c : c))
			.join('; ');
	}
	return (input: RequestInfo | URL, init?: RequestInit) => {
		const headers = new Headers(init?.headers);
		if (cookieHeader) {
			headers.set('cookie', cookieHeader);
		}
		return fetchFn(input, { ...init, headers });
	};
}

function createFetchWithDevFallback(
	baseFetcher: typeof globalThis.fetch,
	devBase: string,
	prodBase: string
): typeof globalThis.fetch {
	return async (input: RequestInfo | URL, init?: RequestInit) => {
		try {
			return await baseFetcher(input, init);
		} catch (err) {
			if (!dev) throw err;
			const url =
				typeof input === 'string'
					? input
					: input instanceof URL
						? input.toString()
						: (input as Request).url;
			if (!url.startsWith(devBase)) throw err;
			const fallbackUrl = url.replace(devBase, prodBase);
			return baseFetcher(fallbackUrl, init);
		}
	};
}

export type GetPayloadSDKOptions = {
	/** Merge with env-based gallery SWR flags (PAYLOAD_SWR_GALLERY, etc.) */
	cacheGallerySwr?: PayloadSwrCacheOptions;
};

function applyGallerySwrWrap(
	fetcher: typeof fetch,
	baseURL: string,
	explicit?: PayloadSwrCacheOptions
): typeof fetch {
	const fromEnv = getPayloadGallerySwrOptionsFromEnv();
	const merged: PayloadSwrCacheOptions = {
		enabled: explicit?.enabled === true || Boolean(fromEnv.enabled),
		staleSeconds: explicit?.staleSeconds ?? fromEnv.staleSeconds,
		softTtlSeconds: explicit?.softTtlSeconds ?? fromEnv.softTtlSeconds
	};
	if (!merged.enabled) return fetcher;
	return wrapFetchWithPayloadSwr(fetcher, baseURL, merged);
}

export function getPayloadSDK(
	fetch?: typeof globalThis.fetch,
	request?: Request,
	options?: GetPayloadSDKOptions
) {
	const baseFetcher =
		request && fetch ? createPayloadFetch(fetch, request) : (fetch ?? globalThis.fetch);

	const baseInit = { credentials: 'include' as RequestCredentials };
	const baseURL = dev ? PUBLIC_PAYLOAD_API_ENDPOINT_DEV : PUBLIC_PAYLOAD_API_ENDPOINT;

	let fetcher: typeof fetch =
		dev && PUBLIC_PAYLOAD_API_ENDPOINT_DEV !== PUBLIC_PAYLOAD_API_ENDPOINT
			? createFetchWithDevFallback(
					baseFetcher,
					PUBLIC_PAYLOAD_API_ENDPOINT_DEV,
					PUBLIC_PAYLOAD_API_ENDPOINT
				)
			: baseFetcher;

	// When request is provided (server), create fresh SDK per call — merge explicit SWR opts with env.
	if (request) {
		const wrapped = applyGallerySwrWrap(fetcher, baseURL, options?.cacheGallerySwr);
		return new PayloadSDK<Config>({
			baseURL,
			fetch: wrapped,
			baseInit
		});
	}

	// Singleton: only env flags apply (PAYLOAD_SWR_GALLERY); no per-call options.
	if (!sdk) {
		const wrapped = applyGallerySwrWrap(fetcher, baseURL, undefined);
		sdk = new PayloadSDK<Config>({
			baseURL,
			fetch: wrapped,
			baseInit
		});
	}
	return sdk;
}

export const payloadSDK = () => getPayloadSDK();
