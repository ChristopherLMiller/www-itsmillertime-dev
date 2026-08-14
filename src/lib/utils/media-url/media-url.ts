import { PUBLIC_PAYLOAD_URL, PUBLIC_URL } from '$env/static/public';

/** Upload collections served from Cloudflare edge hostnames `{collection}.{apex}`. */
const CDN_UPLOAD_COLLECTIONS = new Set(['media', 'gallery-images']);

const PAYLOAD_UPLOAD_PATH = /^\/api\/([^/]+)\/file\/(.+)$/;

const CDN_APEX_HOST = resolveCdnApexHost(PUBLIC_URL);

function resolveCdnApexHost(publicUrl: string): string {
	try {
		const parts = new URL(publicUrl).hostname.split('.').filter(Boolean);
		if (parts.length >= 2) return parts.slice(-2).join('.');
		if (parts.length === 1) return parts[0];
	} catch {
		// Fall through to the production apex.
	}
	return 'itsmillertime.dev';
}

function isAbsoluteUrl(value: string): boolean {
	return /^https?:\/\//i.test(value);
}

/** Resolve a Payload media path (relative or absolute) against the CMS origin. */
function toAbsolutePayloadUrl(path: string): string {
	if (isAbsoluteUrl(path)) return path;
	return new URL(path, `${PUBLIC_PAYLOAD_URL.replace(/\/$/, '')}/`).href;
}

/**
 * Path + query to forward through `/api/media-proxy` (auth cookies stay on this origin).
 */
function toProxyPath(path: string): string {
	if (!isAbsoluteUrl(path)) return path.startsWith('/') ? path : `/${path}`;
	try {
		const url = new URL(path);
		return `${url.pathname}${url.search}`;
	} catch {
		return path.startsWith('/') ? path : `/${path}`;
	}
}

/**
 * Rewrite Payload upload file URLs onto the Cloudflare edge hostname.
 *
 * https://cms.itsmillertime.dev/api/gallery-images/file/IMG_3213-1920x1280.avif?prefix=gallery-images
 * → https://gallery-images.itsmillertime.dev/IMG_3213-1920x1280.avif?prefix=gallery-images
 *
 * Same mapping for `{media}` → `https://media.{apex}/…`. Other URLs are unchanged.
 */
export function toCloudflareMediaUrl(path: string | null | undefined): string {
	if (!path) return '';

	let url: URL;
	try {
		url = new URL(toAbsolutePayloadUrl(path));
	} catch {
		return path;
	}

	const match = PAYLOAD_UPLOAD_PATH.exec(url.pathname);
	if (!match) return url.href;

	const collection = match[1];
	const filePath = match[2];
	if (!CDN_UPLOAD_COLLECTIONS.has(collection)) return url.href;

	const cdn = new URL(`https://${collection}.${CDN_APEX_HOST}`);
	cdn.pathname = `/${filePath}`;
	cdn.search = url.search;
	return cdn.href;
}

/**
 * Returns the full URL for a media asset. When `proxy` is true, routes through
 * the SvelteKit server so auth cookies are forwarded (needed for NSFW/restricted content).
 * Public `media` and `gallery-images` file URLs are rewritten to the Cloudflare edge cache.
 */
export function getMediaUrl(path: string | null | undefined, proxy = false): string {
	if (!path) return '';
	if (proxy) return `/api/media-proxy${toProxyPath(path)}`;
	return toCloudflareMediaUrl(path);
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
		{ mimeType?: string | null; filename?: string | null; url?: string | null } | null | undefined
): boolean {
	if (!media) return false;
	if (media.mimeType === 'image/gif') return true;
	const name = (media.filename ?? media.url ?? '').toLowerCase();
	return name.endsWith('.gif') || name.includes('.gif?');
}

type SizedMedia = {
	url?: string | null;
	mimeType?: string | null;
	filename?: string | null;
	sizes?: {
		xlarge?: { url?: string | null } | null;
		large?: { url?: string | null } | null;
	} | null;
};

/**
 * Lightbox paint URL: prefer a large derivative so first paint stays light.
 * GIFs/videos always use the original.
 */
export function getLightboxPaintUrl(
	media: SizedMedia | null | undefined,
	proxy = false
): string | null {
	if (!media) return null;
	if (isGifMedia(media) || isVideoMedia(media)) {
		return media.url ? getMediaUrl(media.url, proxy) : null;
	}
	const path = media.sizes?.xlarge?.url ?? media.sizes?.large?.url ?? media.url;
	return path ? getMediaUrl(path, proxy) : null;
}

/** Full original for sharp zoom bitmap / pinch detail. */
export function getLightboxZoomUrl(
	media: SizedMedia | null | undefined,
	proxy = false
): string | null {
	if (!media?.url) return null;
	return getMediaUrl(media.url, proxy);
}
