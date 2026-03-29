import { dev } from '$app/environment';
import { PUBLIC_PAYLOAD_API_ENDPOINT, PUBLIC_PAYLOAD_API_ENDPOINT_DEV } from '$env/static/public';
import { wrapFetchWithPayloadSwr } from '$lib/cache/payloadSwrFetch';
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

export function getPayloadSDK(fetch?: typeof globalThis.fetch, request?: Request) {
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

	fetcher = wrapFetchWithPayloadSwr(fetcher, baseURL, {});

	if (request) {
		return new PayloadSDK<Config>({
			baseURL,
			fetch: fetcher,
			baseInit
		});
	}

	if (!sdk) {
		sdk = new PayloadSDK<Config>({
			baseURL,
			fetch: fetcher,
			baseInit
		});
	}
	return sdk;
}

export const payloadSDK = () => getPayloadSDK();
