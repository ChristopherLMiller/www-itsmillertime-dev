/** Cookie written by `/api/share-target/destination` and read by `POST /api/share-target`. */
export const SHARE_TARGET_DEST_COOKIE = 'share_target_dest';

/** One-shot server flash after `POST /api/share-target` (avoid long query strings). */
export const SHARE_TARGET_FLASH_COOKIE = 'share_target_flash';

export type ShareTargetDestination = { mode: 'media' } | { mode: 'gallery-image'; albumId: number };

const COOKIE_MEDIA = 'media';
const galleryPrefix = 'gallery:';

export function encodeShareTargetDestination(dest: ShareTargetDestination): string {
	if (dest.mode === 'media') return COOKIE_MEDIA;
	return `${galleryPrefix}${dest.albumId}`;
}

export function parseShareTargetDestination(raw: string | undefined): ShareTargetDestination {
	if (!raw || raw === COOKIE_MEDIA) return { mode: 'media' };
	const trimmed = raw.trim();
	if (trimmed.startsWith(galleryPrefix)) {
		const id = Number.parseInt(trimmed.slice(galleryPrefix.length), 10);
		if (Number.isFinite(id) && id > 0) return { mode: 'gallery-image', albumId: id };
	}
	return { mode: 'media' };
}
