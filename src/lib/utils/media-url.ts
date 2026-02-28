import { PUBLIC_PAYLOAD_URL } from '$env/static/public';

/**
 * Returns the full URL for a media asset. When `proxy` is true, routes through
 * the SvelteKit server so auth cookies are forwarded (needed for NSFW/restricted content).
 */
export function getMediaUrl(path: string | null | undefined, proxy = false): string {
	if (!path) return '';
	if (proxy) return `/api/media-proxy${path}`;
	return `${PUBLIC_PAYLOAD_URL}${path}`;
}
