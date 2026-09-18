import type { GalleryAlbumPageMeta } from '$lib/cache/galleryCache';
import { displayableImageTitle } from '$lib/utils/gallery-image-display';
import { lexicalToPlainText } from '$lib/utils/lexical-to-text';

type SeoImageSizes = {
	og?: {
		url?: string | null;
		width?: number | null;
		height?: number | null;
	} | null;
};

export type GalleryImageSeoSource = {
	alt?: string | null;
	filename?: string | null;
	caption?: unknown;
	url?: string | null;
	width?: number | null;
	height?: number | null;
	sizes?: SeoImageSizes | null;
	image?: unknown;
	meta?: {
		title?: string | null;
		description?: string | null;
		image?: unknown;
	} | null;
};

function isSeoImageAsset(value: unknown): value is {
	url?: string | null;
	width?: number | null;
	height?: number | null;
	sizes?: SeoImageSizes | null;
} {
	if (typeof value !== 'object' || value === null) return false;
	const asset = value as { url?: unknown; sizes?: { og?: { url?: unknown } } };
	if (typeof asset.url === 'string' && asset.url.length > 0) return true;
	const ogUrl = asset.sizes?.og?.url;
	return typeof ogUrl === 'string' && ogUrl.length > 0;
}

function imageHasPublicSeoUrl(image: GalleryImageSeoSource): boolean {
	if (typeof image.url === 'string' && image.url.length > 0) return true;
	const ogUrl = image.sizes?.og?.url;
	return typeof ogUrl === 'string' && ogUrl.length > 0;
}

function firstText(...values: Array<string | null | undefined>): string | undefined {
	for (const value of values) {
		const text = value?.trim();
		if (text) return text;
	}
	return undefined;
}

function captionPlainText(caption: unknown): string {
	if (typeof caption !== 'object' || caption === null) return '';
	return lexicalToPlainText(caption as { root?: { children?: never[] } }).trim();
}

/** Prefer an explicit CMS SEO image, then the photo itself (including nested upload). */
export function resolveGalleryImageSeoAsset(image: GalleryImageSeoSource): unknown | null {
	if (isSeoImageAsset(image.meta?.image)) return image.meta.image;
	if (imageHasPublicSeoUrl(image)) return image;
	if (isSeoImageAsset(image.image)) return image.image;
	return null;
}

export function buildGalleryImagePageMeta(options: {
	image: GalleryImageSeoSource;
	albumMeta: GalleryAlbumPageMeta;
	origin: string;
	slug: string;
	selectedId: number;
}): GalleryAlbumPageMeta {
	const { image, albumMeta, origin, slug, selectedId } = options;
	const imageTitle = firstText(
		image.meta?.title,
		displayableImageTitle(image.alt, image.filename)
	);
	const imageDescription = firstText(image.meta?.description, captionPlainText(image.caption));

	// Missing alt/caption (including filename-like alts) inherit the album SEO text.
	const title = imageTitle ?? firstText(albumMeta.title, albumMeta.metaTitle) ?? '';
	const description =
		imageDescription ?? firstText(albumMeta.description, albumMeta.metaDescription);
	const seoImage = resolveGalleryImageSeoAsset(image) ?? albumMeta.metaImage ?? albumMeta.image;

	return {
		title,
		metaTitle: imageTitle ?? albumMeta.metaTitle ?? title,
		description,
		metaDescription: imageDescription ?? albumMeta.metaDescription ?? description,
		image: seoImage,
		metaImage: seoImage,
		canonicalURL: `${origin}/galleries/${slug}?selected=${selectedId}`
	};
}
