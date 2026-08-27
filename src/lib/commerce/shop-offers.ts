import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';
import { formatPrintOfferLabel } from './print-size';

export type { PrintAspectFit } from './print-size';
export { imageAspectRatioNormalized, printSizeAspectFit, printSizeAspectRatio } from './print-size';

export type ShopOffer = {
	variantId: string;
	/** Variant size label shown in the shop (e.g. "4×6″ · 240gsm"). */
	title: string;
	priceUSD: number | null;
};

export type ShopOfferGroup = {
	id: string;
	name: string;
	kind: 'digital' | 'print';
	/** Offering set description for this paper type, or download copy for digital. */
	description: string | null;
	offers: ShopOffer[];
};

export const DIGITAL_DOWNLOAD_DESCRIPTION =
	"After checkout, you'll receive an email containing the image(s) you purchased.";

const SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i;

export function displaySizeLabel(value: string | null | undefined): string {
	return formatPrintOfferLabel(value);
}

function isSizeFirstLabel(value: string): boolean {
	return SIZE_PATTERN.test(value) && /^\d/.test(value);
}

/** Prefer the saved variant title when it is the size label, not the short Format option. */
function printSizeSource(variant: GalleryCommerceVariant): string | null | undefined {
	const title = variant.title?.trim() ?? '';
	const format = variant.format?.trim() ?? '';
	if (isSizeFirstLabel(title) && title.length >= format.length) return title;
	return format || title || null;
}

function sizeSortKey(label: string): number {
	const match = label.match(SIZE_PATTERN);
	if (!match) return Number.POSITIVE_INFINITY;
	return Number(match[1]) * Number(match[2]);
}

function compareOffers(a: ShopOffer, b: ShopOffer): number {
	const bySize = sizeSortKey(a.title) - sizeSortKey(b.title);
	if (bySize !== 0) return bySize;
	return a.title.localeCompare(b.title);
}

function paperGroupName(variant: GalleryCommerceVariant): string {
	const paper = variant.paper?.trim();
	if (paper) return paper;
	return variant.digital ? 'Digital' : 'Prints';
}

function sizeLabel(variant: GalleryCommerceVariant): string {
	if (variant.digital) {
		const format = (variant.format ?? '').trim();
		if (!format || /digital/i.test(format)) return 'Download';
		return formatPrintOfferLabel(format);
	}
	return formatPrintOfferLabel(printSizeSource(variant));
}

/**
 * Group store variants by paper / offering set. Size buttons use the saved
 * variant title when it is a size label; otherwise the Format option. Digital
 * is treated as its own paper type.
 */
export function groupShopOffers(variants: GalleryCommerceVariant[]): ShopOfferGroup[] {
	const byPaper = new Map<string, ShopOfferGroup>();

	for (const variant of variants) {
		if (!variant.variantId) continue;
		const name = paperGroupName(variant);
		const kind: ShopOfferGroup['kind'] = variant.digital ? 'digital' : 'print';
		const existing = byPaper.get(name);
		const offer: ShopOffer = {
			variantId: variant.variantId,
			title: sizeLabel(variant),
			priceUSD: typeof variant.priceUSD === 'number' ? variant.priceUSD : null
		};
		const description =
			kind === 'digital'
				? variant.paperDescription?.trim() || DIGITAL_DOWNLOAD_DESCRIPTION
				: variant.paperDescription?.trim() || null;
		if (existing) {
			existing.offers.push(offer);
			if (!existing.description && description) existing.description = description;
			continue;
		}
		byPaper.set(name, {
			id: kind === 'digital' ? 'digital' : `print:${name}`,
			name,
			kind,
			description,
			offers: [offer]
		});
	}

	const groups = [...byPaper.values()];
	for (const group of groups) {
		group.offers.sort(compareOffers);
	}
	groups.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'digital' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});
	return groups;
}

export function formatUsd(amount: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
