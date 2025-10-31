import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { PayloadSDK } from '@payloadcms/sdk';
import type { Config } from '$lib/types/payload-types';

let sdk: PayloadSDK<Config> | null = null;

export function getPayloadSDK(fetch?: typeof globalThis.fetch) {
	if (!sdk) {
		sdk = new PayloadSDK<Config>({
			baseURL: PUBLIC_PAYLOAD_API_ENDPOINT,
			fetch: fetch ?? globalThis.fetch
		});
	}
	return sdk;
}

export const payloadSDK = () => getPayloadSDK();
