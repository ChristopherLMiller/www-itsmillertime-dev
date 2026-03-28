import type { GalleryImage, Media } from '$lib/types/payload-types';

export type GalleryGridMedia = Media & { isNsfw: boolean; galleryImageId?: number };

/**
 * Maps a Payload gallery-image document (depth ≥ 1 for nested `image` media) to the
 * `Media` shape used by Polaroid / Lightbox, with NSFW and gallery row id.
 */
export function galleryImageDocToDisplayMedia(
	doc: unknown,
	albumIsNsfw: boolean
): GalleryGridMedia | null {
	if (typeof doc !== 'object' || doc === null) return null;

	const imageDoc = doc as Partial<GalleryImage>;
	const docIsNsfw = imageDoc.settings?.isNsfw === true || albumIsNsfw;
	const galleryImageId = imageDoc.id;

	if ('url' in imageDoc && 'id' in imageDoc) {
		return { ...(imageDoc as Media), isNsfw: docIsNsfw, galleryImageId };
	}

	if ('image' in imageDoc) {
		const candidate = (imageDoc as { image?: unknown }).image;
		if (typeof candidate === 'object' && candidate !== null && 'id' in candidate) {
			return { ...(candidate as Media), isNsfw: docIsNsfw, galleryImageId };
		}
	}

	return null;
}
