import { dev } from '$app/environment';
import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
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

export function getPayloadSDK(fetch?: typeof globalThis.fetch, request?: Request) {
	const fetcher =
		request && fetch
			? createPayloadFetch(fetch, request)
			: (fetch ?? globalThis.fetch);

	// When request is provided, create a fresh SDK per call so each request gets its own cookies
	if (request) {
		return new PayloadSDK<Config>({
			baseURL: PUBLIC_PAYLOAD_API_ENDPOINT,
			fetch: fetcher
		});
	}

	if (!sdk) {
		sdk = new PayloadSDK<Config>({
			baseURL: PUBLIC_PAYLOAD_API_ENDPOINT,
			fetch: fetcher
		});
	}
	return sdk;
}

export const payloadSDK = () => getPayloadSDK();
