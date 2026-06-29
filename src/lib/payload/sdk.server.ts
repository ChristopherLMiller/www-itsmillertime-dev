/**
 * Server-only Payload SDK with optional Upstash SWR on eligible GETs.
 * Import this from `+page.server.ts`, `+server.ts`, etc. — never from universal `+page.ts`.
 */
import { PayloadSDK } from '@payloadcms/sdk';
import type { Config } from '$lib/types/payload-types';
import { createPayloadInnerFetch, payloadSdkBaseInit } from '$lib/payload';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { wrapFetchWithPayloadSwr } from '$lib/cache/payloadSwrFetch.server';

let serverSdkSingleton: PayloadSDK<Config> | null = null;

export function getPayloadSDK(fetch?: typeof globalThis.fetch, request?: Request) {
	const { innerFetch } = createPayloadInnerFetch(fetch, request);
	const baseURL = getPayloadApiBaseUrl();
	const fetcher = wrapFetchWithPayloadSwr(innerFetch, baseURL);

	if (request) {
		return new PayloadSDK<Config>({
			baseURL,
			fetch: fetcher,
			baseInit: payloadSdkBaseInit
		});
	}

	if (!serverSdkSingleton) {
		serverSdkSingleton = new PayloadSDK<Config>({
			baseURL,
			fetch: fetcher,
			baseInit: payloadSdkBaseInit
		});
	}
	return serverSdkSingleton;
}
