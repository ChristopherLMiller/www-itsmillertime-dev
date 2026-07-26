/**
 * Server-only Payload SDK. Import this from `+page.server.ts`, `+server.ts`, etc.
 * Requests go straight to the Payload REST API (no cache layer).
 */
import { PayloadSDK } from '@payloadcms/sdk';
import type { Config } from '$lib/types/payload-types';
import { createPayloadInnerFetch, payloadSdkBaseInit } from '$lib/payload';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';

let serverSdkSingleton: PayloadSDK<Config> | null = null;

export function getPayloadSDK(fetch?: typeof globalThis.fetch, request?: Request) {
	const { innerFetch } = createPayloadInnerFetch(fetch, request);
	const baseURL = getPayloadApiBaseUrl();

	if (request) {
		return new PayloadSDK<Config>({
			baseURL,
			fetch: innerFetch,
			baseInit: payloadSdkBaseInit
		});
	}

	if (!serverSdkSingleton) {
		serverSdkSingleton = new PayloadSDK<Config>({
			baseURL,
			fetch: innerFetch,
			baseInit: payloadSdkBaseInit
		});
	}
	return serverSdkSingleton;
}
