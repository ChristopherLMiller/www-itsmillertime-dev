/** One-shot server flash after `POST /api/share-target` (avoid long query strings). */
export const SHARE_TARGET_FLASH_COOKIE = 'share_target_flash';

export type ShareTargetDestination = { mode: 'media' } | { mode: 'gallery-image' };
