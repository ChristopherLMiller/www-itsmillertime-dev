/**
 * Per-request opt-in for Payload SWR (Upstash). Pass as the third argument to
 * `sdk.find`, `sdk.findByID`, etc.: `sdk.find({ ... }, payloadSwrInit())`.
 *
 * Only requests that include this header are eligible for caching (see payloadSwrFetch).
 */
export const PAYLOAD_SWR_HEADER = 'x-payload-swr';

export type PayloadSwrInitOptions = {
	/** Override default stale threshold (seconds); omit to use env or built-in default */
	staleSeconds?: number;
	/** Override Redis TTL (seconds); omit to use env or built-in default */
	softTtlSeconds?: number;
};

/**
 * @example sdk.find({ collection: 'gallery-images', where: {...}, limit: 1 }, payloadSwrInit())
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
