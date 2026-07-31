import type { Media } from '$lib/types/payload-types';
import { getMediaUrl } from '$lib/utils/media-url';
import type { SlideData } from 'photoswipe';

const SIZE_KEYS = ['xlarge', 'large', 'medium', 'small', 'thumbnail'] as const;

function resolveDims(img: Media): { width: number; height: number } {
	if (img.width && img.height) {
		return { width: img.width, height: img.height };
	}
	for (const key of SIZE_KEYS) {
		const size = img.sizes?.[key];
		if (size?.width && size?.height) {
			return { width: size.width, height: size.height };
		}
	}
	return { width: 1600, height: 1200 };
}

function thumbnailUrl(img: Media, useProxy: boolean): string | undefined {
	const thumb = img.sizes?.thumbnail?.url ?? img.sizes?.small?.url;
	if (thumb) return getMediaUrl(thumb, useProxy);
	if (img.blurhash) return img.blurhash;
	return undefined;
}

/**
 * Map Payload Media into a PhotoSwipe slide.
 * Uses the full original as `src` (no srcset) so zoom isn't limited to a
 * viewport-sized derivative. `msrc` is only a lightweight open placeholder.
 */
export function mediaToPhotoSwipeSlide(
	img: Media,
	options: {
		useProxy?: boolean;
		/** Thumbnail element for open/close zoom animation */
		element?: HTMLElement | null;
		/** Set when the thumbnail uses object-fit: cover */
		thumbCropped?: boolean;
	} = {}
): SlideData {
	const useProxy = options.useProxy === true;
	const src = img.url ? getMediaUrl(img.url, useProxy) : '';
	const { width, height } = resolveDims(img);
	const msrc = thumbnailUrl(img, useProxy);

	return {
		src,
		width,
		height,
		alt: img.alt ?? '',
		...(msrc ? { msrc } : {}),
		...(options.element ? { element: options.element } : {}),
		...(options.thumbCropped ? { thumbCropped: true } : {})
	};
}
