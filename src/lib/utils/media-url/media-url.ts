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

/**
 * Returns true if the media is a video (by mimeType or YouTube URL).
 */
export function isVideoMedia(
	media: { mimeType?: string | null; url?: string | null } | null
): boolean {
	if (!media) return false;
	if (media.mimeType?.startsWith('video/')) return true;
	const url = media.url ?? '';
	return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

/**
 * Animated GIFs must use the original file. Payload size variants (AVIF/JPEG)
 * often stack every frame into a tall static "filmstrip".
 */
export function isGifMedia(
	media:
		| { mimeType?: string | null; filename?: string | null; url?: string | null }
		| null
		| undefined
): boolean {
	if (!media) return false;
	if (media.mimeType === 'image/gif') return true;
	const name = (media.filename ?? media.url ?? '').toLowerCase();
	return name.endsWith('.gif') || name.includes('.gif?');
}
