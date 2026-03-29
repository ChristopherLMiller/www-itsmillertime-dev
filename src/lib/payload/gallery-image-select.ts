/**
 * Payload `select` for gallery-images findByID — smaller JSON than full documents.
 */

const mediaSizesForSrcset = {
	thumbnail: { url: true, width: true, height: true, mimeType: true },
	small: { url: true, width: true, height: true, mimeType: true },
	medium: { url: true, width: true, height: true, mimeType: true },
	large: { url: true, width: true, height: true, mimeType: true },
	xlarge: { url: true, width: true, height: true, mimeType: true },
	og: { url: true, width: true, height: true, mimeType: true }
} as const;

/** Landing / preview API: row-level thumbnail fields only */
export const galleryImageSelectBasic = {
	id: true,
	blurhash: true,
	url: true,
	thumbnailURL: true,
	width: true,
	height: true,
	mimeType: true,
	sizes: { thumbnail: mediaSizesForSrcset.thumbnail }
} as const;

const nestedMediaForPolaroid = {
	url: true,
	thumbnailURL: true,
	mimeType: true,
	width: true,
	height: true,
	alt: true,
	caption: true,
	blurhash: true,
	exif: true,
	sizes: mediaSizesForSrcset
} as const;

/**
 * Album polaroid + lightbox: prefer row `sizes` when the file lives on gallery-image;
 * `image` covers upload-on-relation setups (depth 1).
 */
export const galleryImageSelectFull = {
	id: true,
	settings: { isNsfw: true },
	blurhash: true,
	alt: true,
	caption: true,
	updatedAt: true,
	createdAt: true,
	url: true,
	thumbnailURL: true,
	mimeType: true,
	width: true,
	height: true,
	sizes: mediaSizesForSrcset,
	image: nestedMediaForPolaroid
} as const;
