import { dev } from '$app/environment';
import { PUBLIC_PAYLOAD_API_ENDPOINT, PUBLIC_PAYLOAD_API_ENDPOINT_DEV } from '$env/static/public';
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

const baseInit = { credentials: 'include' as RequestCredentials };

/**
 * Cookie + dev-fallback chain only (no SWR). Safe to import from client bundles.
 * Server code that needs Upstash SWR should use `getPayloadSDK` from `$lib/payload.server`.
 */
export function createPayloadInnerFetch(
	fetch?: typeof globalThis.fetch,
	request?: Request
): { innerFetch: typeof globalThis.fetch; baseURL: string } {
	const baseFetcher =
		request && fetch ? createPayloadFetch(fetch, request) : (fetch ?? globalThis.fetch);

	const baseURL = PUBLIC_PAYLOAD_API_ENDPOINT;

	const innerFetch =
		dev && PUBLIC_PAYLOAD_API_ENDPOINT_DEV !== PUBLIC_PAYLOAD_API_ENDPOINT
			? createFetchWithDevFallback(
					baseFetcher,
					PUBLIC_PAYLOAD_API_ENDPOINT_DEV,
					PUBLIC_PAYLOAD_API_ENDPOINT
				)
			: baseFetcher;

	return { innerFetch, baseURL };
}

/** Universal / client-safe Payload SDK (no server private env, no SWR). */
export function getPayloadSDK(fetch?: typeof globalThis.fetch, request?: Request) {
	const { innerFetch, baseURL } = createPayloadInnerFetch(fetch, request);

	if (request) {
		return new PayloadSDK<Config>({
			baseURL,
			fetch: innerFetch,
			baseInit
		});
	}

	if (!sdk) {
		sdk = new PayloadSDK<Config>({
			baseURL,
			fetch: innerFetch,
			baseInit
		});
	}
	return sdk;
}

export { baseInit as payloadSdkBaseInit };
