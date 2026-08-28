import type { GalleryImage, Media } from '$lib/types/payload-types';
import { mediaRequiresAuthProxy } from '$lib/utils/gallery-access';

/**
 * Commerce data attached to a sellable gallery image. Resolved server-side from
 * Medusa (the source of truth) by the gallery image endpoint, not stored in
 * Payload. Present only when the image maps to a published product.
 */
export type GalleryCommerceVariant = {
	variantId: string;
	title: string;
	priceUSD?: number | null;
	digital?: boolean;
	/** Offering set / paper type. Null for digital. */
	paper?: string | null;
	/** Offering set description for this paper type. */
	paperDescription?: string | null;
	/** Size / format (e.g. "11x14"). */
	format?: string | null;
	/** Prodigi paper finish (e.g. "Gloss"). Null when Standard or unset. */
	finish?: string | null;
};

export type GalleryCommerce = {
	forSale?: boolean | null;
	priceUSD?: number | null;
	productId?: string | null;
	variantId?: string | null;
	variants?: GalleryCommerceVariant[] | null;
};

export type GalleryGridMedia = Media & {
	isNsfw: boolean;
	/**
	 * When true, load bytes through `/api/media-proxy` even if the parent album is public
	 * (per-image NSFW / AUTHENTICATED / PRIVILEGED settings).
	 */
	needsProxy: boolean;
	galleryImageId?: number;
	commerce?: GalleryCommerce | null;
	/** Pixel size of the private master file, when Payload populated it. Used for print DPI. */
	printWidth?: number | null;
	printHeight?: number | null;
};

/** Payload `medusaProductId` pointer — a listing exists; Medusa is still source of truth for sale. */
export function isShopListingPointer(medusaProductId: unknown): boolean {
	return typeof medusaProductId === 'string' && medusaProductId.trim().length > 0;
}

function readCommerce(doc: object): GalleryCommerce | null | undefined {
	if (!('commerce' in doc)) return undefined;
	return (doc as { commerce?: GalleryCommerce | null }).commerce ?? null;
}

/** Polaroid `basic` fetches omit commerce; don't let them wipe a full fetch or fake "not for sale". */
export function mergeGalleryGridMedia(
	existing: GalleryGridMedia | undefined,
	incoming: GalleryGridMedia
): GalleryGridMedia {
	const commerce = incoming.commerce !== undefined ? incoming.commerce : existing?.commerce;
	const printWidth = incoming.printWidth ?? existing?.printWidth;
	const printHeight = incoming.printHeight ?? existing?.printHeight;
	return {
		...existing,
		...incoming,
		...(commerce !== undefined ? { commerce } : {}),
		...(printWidth != null ? { printWidth } : {}),
		...(printHeight != null ? { printHeight } : {})
	};
}

/** Attach live Medusa store data onto a gallery-image API document. */
export function commerceFromStoreProduct(product: {
	productId: string;
	variantId: string | null;
	priceUSD: number | null;
	variants: GalleryCommerceVariant[];
}): GalleryCommerce | null {
	if (!product.variantId && product.variants.length === 0) return null;
	return {
		forSale: true,
		productId: product.productId,
		variantId: product.variantId,
		priceUSD: product.priceUSD,
		variants: product.variants
	};
}

const PLACEHOLDER_DATE = '1970-01-01T00:00:00.000Z';

/** Tokens added by ingest (piu watermark / size derivatives), not part of the title. */
const FILENAME_PROCESSING_TOKENS = new Set([
	'full',
	'watermarked',
	'watermark',
	'wm',
	'thumb',
	'thumbnail',
	'large',
	'xlarge',
	'original',
	'master',
	'web',
	'preview'
]);

function filenameTokens(value: string): string[] {
	const withoutExt = value.trim().replace(/\.[a-z0-9]{1,8}$/i, '');
	return withoutExt
		.toLowerCase()
		.replace(/\+/g, ' ')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean);
}

function stripProcessingTokens(tokens: string[]): string[] {
	let end = tokens.length;
	while (end > 0 && FILENAME_PROCESSING_TOKENS.has(tokens[end - 1]!)) {
		end -= 1;
	}
	return tokens.slice(0, end);
}

/**
 * CMS `defaultAltText` turns `IMG_2848.jpg` into `IMG 2848` (underscores → spaces,
 * extension stripped). Those aren't real titles even when we don't have the
 * stored filename to compare against.
 */
const CAMERA_FILENAME_ALT = /^(img|dsc|dscn|dscf|pict|_?mg)(?:\s+\d+){1,2}$/i;

export function looksLikeCameraFilenameAlt(alt: string | null | undefined): boolean {
	const tokens = stripProcessingTokens(filenameTokens(alt ?? ''));
	if (tokens.length === 0) return false;
	const key = tokens.join(' ');
	if (CAMERA_FILENAME_ALT.test(key)) return true;
	return /^(img|dsc|dscn|dscf|pict|_?mg)\d{3,8}$/i.test(key.replace(/\s/g, ''));
}

/**
 * Payload / CMS defaultAltText often sets `alt` from the filename, replacing
 * `_`/`-` with spaces. New ingest also appends `-full-watermarked` to the
 * stored filename after alt is already set, so `IMG 6468` must still match
 * `IMG_6468-full-watermarked.jpg`.
 */
export function altMatchesFilename(
	alt: string | null | undefined,
	filename: string | null | undefined
): boolean {
	const title = (alt ?? '').trim();
	if (!title) return false;
	if (looksLikeCameraFilenameAlt(title)) return true;

	const file = (filename ?? '').trim();
	if (!file) return false;

	const altTokens = filenameTokens(title);
	const fileTokens = filenameTokens(file);
	if (altTokens.length === 0 || fileTokens.length === 0) return false;

	const altKey = altTokens.join(' ');
	const fileKey = fileTokens.join(' ');
	const fileBaseKey = stripProcessingTokens(fileTokens).join(' ');

	return altKey === fileKey || (fileBaseKey.length > 0 && altKey === fileBaseKey);
}

/** Alt for display (polaroid strip, lightbox title); empty when missing or filename-like. */
export function displayableImageTitle(
	alt: string | null | undefined,
	filename: string | null | undefined
): string {
	const title = (alt ?? '').trim();
	if (!title || altMatchesFilename(title, filename)) return '';
	return title;
}

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
	needsProxy?: boolean;
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
		needsProxy: options.needsProxy ?? false,
		galleryImageId: options.galleryImageId
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function positivePixelSize(value: unknown): { width: number; height: number } | null {
	if (!isRecord(value)) return null;
	const width = value.width;
	const height = value.height;
	if (typeof width === 'number' && width > 0 && typeof height === 'number' && height > 0) {
		return { width, height };
	}
	return null;
}

/** Master-file pixels for print DPI. Does not expose the master URL. */
export function printPixelSizeFromGalleryDoc(doc: unknown): { width: number; height: number } | null {
	if (!isRecord(doc)) return null;
	return (
		positivePixelSize({ width: doc.printWidth, height: doc.printHeight }) ??
		positivePixelSize(doc.master)
	);
}

/** Copy master pixels onto the gallery-image JSON and drop the private master file. */
export function stampPrintPixelsAndRedactMaster(doc: Record<string, unknown>): void {
	const print = printPixelSizeFromGalleryDoc(doc);
	delete doc.master;
	if (print) {
		doc.printWidth = print.width;
		doc.printHeight = print.height;
	}
}

function withoutMaster<T extends object>(media: T): T {
	if (!('master' in media)) return media;
	const { master: _master, ...rest } = media as T & { master?: unknown };
	return rest as T;
}

function withPrintPixels(media: GalleryGridMedia, doc: object): GalleryGridMedia {
	const stripped = withoutMaster(media);
	const print = printPixelSizeFromGalleryDoc(doc);
	if (!print) return stripped;
	return { ...stripped, printWidth: print.width, printHeight: print.height };
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
	const needsProxy = mediaRequiresAuthProxy(imageDoc.settings) || albumIsNsfw;
	const galleryImageId = imageDoc.id;

	const commerce = readCommerce(imageDoc);

	if ('url' in imageDoc && 'id' in imageDoc) {
		return withPrintPixels(
			{
				...(imageDoc as Media),
				isNsfw: docIsNsfw,
				needsProxy,
				galleryImageId,
				...(commerce !== undefined ? { commerce } : {})
			},
			imageDoc
		);
	}

	if ('image' in imageDoc) {
		const candidate = (imageDoc as { image?: unknown }).image;
		if (typeof candidate === 'object' && candidate !== null && 'id' in candidate) {
			return withPrintPixels(
				{
					...(candidate as Media),
					isNsfw: docIsNsfw,
					needsProxy,
					galleryImageId,
					...(commerce !== undefined ? { commerce } : {})
				},
				imageDoc
			);
		}
	}

	return null;
}
