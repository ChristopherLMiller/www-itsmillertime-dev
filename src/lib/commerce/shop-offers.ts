import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';
import { displayFinish } from '$lib/medusa/store-product';
import { formatPrintOfferLabel } from './print-size';

export type { PrintAspectFit } from './print-size';
export { imageAspectRatioNormalized, printSizeAspectFit, printSizeAspectRatio } from './print-size';

export type ShopOffer = {
	variantId: string;
	/** Variant size label shown in the shop (e.g. "4×6″ · 240gsm"). */
	title: string;
	priceUSD: number | null;
	/** True when the variant has a positive store price. */
	purchasable: boolean;
	/** Display finish (e.g. "Gloss"). Null when Standard or unset. */
	finish: string | null;
};

export type ShopFinishOption = {
	value: string;
	label: string;
};

export type ShopOfferGroup = {
	id: string;
	name: string;
	kind: 'digital' | 'print';
	/** Offering set description for this paper type, or download copy for digital. */
	description: string | null;
	offers: ShopOffer[];
};

/** Unique size row in a paper group. Finishes for that size live on the offers. */
export type ShopSizeListing = {
	title: string;
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
	const byTitle = a.title.localeCompare(b.title);
	if (byTitle !== 0) return byTitle;
	return (a.finish ?? '').localeCompare(b.finish ?? '');
}

function paperGroupName(variant: GalleryCommerceVariant): string {
	const paper = variant.paper?.trim();
	return paper || (variant.digital ? 'Digital' : 'Prints');
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
 * Group store variants by paper / offering set. Prodigi finishes stay on the
 * offer so each size listing can show its own finish select. Size buttons use
 * the saved variant title when it is a size label; otherwise the Format
 * option. Digital is treated as its own paper type.
 */
export function groupShopOffers(variants: GalleryCommerceVariant[]): ShopOfferGroup[] {
	const byPaper = new Map<string, ShopOfferGroup>();

	for (const variant of variants) {
		if (!variant.variantId) continue;
		const name = paperGroupName(variant);
		const kind: ShopOfferGroup['kind'] = variant.digital ? 'digital' : 'print';
		const existing = byPaper.get(name);
		const priced = offerIsPurchasable(variant.priceUSD);
		const offer: ShopOffer = {
			variantId: variant.variantId,
			title: sizeLabel(variant),
			priceUSD: priced ? variant.priceUSD! : null,
			// Digital isn't a Prodigi quote — keep it buyable even if calculated_price
			// is missing for a moment. Unpriced print finishes stay disabled.
			purchasable: variant.digital === true || priced,
			finish: kind === 'digital' ? null : displayFinish(variant.finish)
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

/** One row per unique size, preserving size sort from the grouped offers. */
export function listingsForGroup(group: ShopOfferGroup): ShopSizeListing[] {
	const byTitle = new Map<string, ShopOffer[]>();
	for (const offer of group.offers) {
		const existing = byTitle.get(offer.title);
		if (existing) existing.push(offer);
		else byTitle.set(offer.title, [offer]);
	}
	return [...byTitle.entries()].map(([title, offers]) => ({ title, offers }));
}

/**
 * Finish values for a size listing. Empty when the size has no named Prodigi
 * finish. A single named finish still returns a picker option.
 */
export function finishOptionsForOffers(offers: ShopOffer[]): ShopFinishOption[] {
	const named = [
		...new Set(offers.map((offer) => offer.finish).filter((value): value is string => !!value))
	].sort((a, b) => a.localeCompare(b));
	if (named.length === 0) return [];
	const options: ShopFinishOption[] = [];
	if (offers.some((offer) => !offer.finish)) options.push({ value: '', label: 'Standard' });
	for (const finish of named) {
		options.push({ value: finish, label: finish });
	}
	return options;
}

export function offerForFinish(offers: ShopOffer[], finishValue: string): ShopOffer {
	return offers.find((offer) => (offer.finish ?? '') === finishValue) ?? offers[0]!;
}

/** Prefer a purchasable finish for this size; otherwise the first option. */
export function defaultFinishForOffers(offers: ShopOffer[]): string {
	const options = finishOptionsForOffers(offers);
	if (options.length === 0) return '';
	for (const option of options) {
		if (offerForFinish(offers, option.value).purchasable) return option.value;
	}
	return options[0]?.value ?? '';
}

export function uniqueSizeCount(offers: ShopOffer[]): number {
	return new Set(offers.map((offer) => offer.title)).size;
}

export function offerIsPurchasable(priceUSD: number | null | undefined): boolean {
	return typeof priceUSD === 'number' && Number.isFinite(priceUSD) && priceUSD > 0;
}

export function formatUsd(amount: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
