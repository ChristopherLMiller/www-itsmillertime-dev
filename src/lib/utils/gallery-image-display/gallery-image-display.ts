import type { GalleryImage, Media } from '$lib/types/payload-types';

export type GalleryGridMedia = Media & { isNsfw: boolean; galleryImageId?: number };

const PLACEHOLDER_DATE = '1970-01-01T00:00:00.000Z';

/**
 * Minimal `Media` for Polaroid while the full gallery-image fetch runs: blurhash shows inside
 * `Image` (no `url` yet). `id` is the gallery-image row id until replaced by real file media.
 */
export function buildPlaceholderGalleryMedia(options: {
	galleryImageId: number;
	blurhash: string | null | undefined;
	width?: number | null;
	height?: number | null;
	aspectRatioFallback?: number;
	isNsfw?: boolean;
}): GalleryGridMedia {
	const ar = options.aspectRatioFallback ?? 3 / 4;
	let w = typeof options.width === 'number' && options.width > 0 ? options.width : 0;
	let h = typeof options.height === 'number' && options.height > 0 ? options.height : 0;
	if (w <= 0 || h <= 0) {
		h = 100;
		w = Math.max(1, Math.round(h * ar));
	}

	return {
		id: options.galleryImageId,
		alt: '',
		url: '',
		width: w,
		height: h,
		blurhash: options.blurhash && options.blurhash.length > 0 ? options.blurhash : null,
		updatedAt: PLACEHOLDER_DATE,
		createdAt: PLACEHOLDER_DATE,
		isNsfw: options.isNsfw ?? false,
		galleryImageId: options.galleryImageId
	};
}

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
