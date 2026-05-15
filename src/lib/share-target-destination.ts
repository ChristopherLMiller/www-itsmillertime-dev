/** Cookie written by `/api/share-target/destination` and read by `POST /api/share-target`. */
export const SHARE_TARGET_DEST_COOKIE = 'share_target_dest';

/** One-shot server flash after `POST /api/share-target` (avoid long query strings). */
export const SHARE_TARGET_FLASH_COOKIE = 'share_target_flash';

export type ShareTargetDestination = { mode: 'media' } | { mode: 'gallery-image' };

const COOKIE_MEDIA = 'media';
/** Current cookie value for gallery-image mode (no per-upload album in share flow). */
const COOKIE_GALLERY_IMAGE = 'gallery-image';
/** Legacy cookies used `gallery:<numeric id>`; still parse as gallery-image. */
const legacyGalleryPrefix = 'gallery:';

export function encodeShareTargetDestination(dest: ShareTargetDestination): string {
	if (dest.mode === 'media') return COOKIE_MEDIA;
	return COOKIE_GALLERY_IMAGE;
}

export function parseShareTargetDestination(raw: string | undefined): ShareTargetDestination {
	if (!raw || raw === COOKIE_MEDIA) return { mode: 'media' };
	const trimmed = raw.trim();
	if (trimmed === COOKIE_GALLERY_IMAGE) return { mode: 'gallery-image' };
	if (trimmed.startsWith(legacyGalleryPrefix)) {
		const rest = trimmed.slice(legacyGalleryPrefix.length);
		const id = Number.parseInt(rest, 10);
		if (Number.isFinite(id) && id > 0) return { mode: 'gallery-image' };
	}
	return { mode: 'media' };
}
