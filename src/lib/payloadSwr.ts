/**
 * Per-request opt-in for Payload SWR (Upstash). Pass as the third argument to
 * `sdk.find`, `sdk.findByID`, etc.: `sdk.find({ ... }, payloadSwrInit())`.
 *
 * Only applies when using `getPayloadSDK` from `$lib/payload.server` (SWR wrapper).
 * Add cache key rules in `payloadSwrRules.server.ts`.
 */
export const PAYLOAD_SWR_HEADER = 'x-payload-swr';

export type PayloadSwrInitOptions = {
	/** Override default stale threshold (seconds); omit to use env or built-in default */
	staleSeconds?: number;
	/** Override Redis TTL (seconds); omit to use env or built-in default */
	softTtlSeconds?: number;
};

/**
 * @example sdk.findByID({ collection: 'gallery-images', id: 1, depth: 1 }, payloadSwrInit())
 * @example sdk.find({ ... }, payloadSwrInit({ staleSeconds: 120 }))
 */
export function payloadSwrInit(options?: PayloadSwrInitOptions): RequestInit {
	const value =
		options && (options.staleSeconds != null || options.softTtlSeconds != null)
			? JSON.stringify({
					staleSeconds: options.staleSeconds,
					softTtlSeconds: options.softTtlSeconds
				})
			: '1';

	return {
		headers: {
			[PAYLOAD_SWR_HEADER]: value
		}
	};
}
