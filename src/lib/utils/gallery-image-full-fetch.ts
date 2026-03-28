import { galleryImageDocToDisplayMedia, type GalleryGridMedia } from './gallery-image-display';

const inflight = new Map<number, Promise<GalleryGridMedia | null>>();

/**
 * One in-flight request per gallery-image id so Masonry remounts / effect re-runs
 * do not stack duplicate / canceled fetches.
 */
export function fetchGalleryImageFullForPolaroid(
	galleryImageId: number,
	albumIsNsfw: boolean
): Promise<GalleryGridMedia | null> {
	const existing = inflight.get(galleryImageId);
	if (existing) return existing;

	const promise = (async (): Promise<GalleryGridMedia | null> => {
		try {
			const res = await fetch(`/api/gallery/images/${galleryImageId}?data=full`);
			if (!res.ok) return null;
			const doc: unknown = await res.json();
			return galleryImageDocToDisplayMedia(doc, albumIsNsfw);
		} catch {
			return null;
		} finally {
			inflight.delete(galleryImageId);
		}
	})();

	inflight.set(galleryImageId, promise);
	return promise;
}
