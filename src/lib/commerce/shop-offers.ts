import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';
import { displayFinish } from '$lib/medusa/store-product';
import { extraPrintLabelParts, formatPrintOfferLabel } from './print-size';

export type { PrintAspectFit } from './print-size';
export { imageAspectRatioNormalized, printSizeAspectFit, printSizeAspectRatio } from './print-size';

export type ShopOffer = {
	variantId: string;
	/** Variant size label shown in the shop (e.g. "4×6″ · 240gsm"). */
	title: string;
	/** Paper type chips from the SKU (lab code or extra name, not both). Empty if none is specified. */
	paperChips: string[];
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
	paperChips: string[];
	offers: ShopOffer[];
};

export const DIGITAL_DOWNLOAD_DESCRIPTION =
	"After checkout, you'll receive an email containing the image(s) you purchased.";

const SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i;
const PAPER_CODE = /^(hpr|lpp|gpr|gpp)$/i;

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
	const byChip = a.paperChips.join('·').localeCompare(b.paperChips.join('·'));
	if (byChip !== 0) return byChip;
	return (a.finish ?? '').localeCompare(b.finish ?? '');
}

function paperGroupName(variant: GalleryCommerceVariant): string {
	const paper = variant.paper?.trim();
	return paper || (variant.digital ? 'Digital' : 'Prints');
}

function skipPaperChipTokens(variant: GalleryCommerceVariant): Set<string> {
	return new Set(
		[variant.finish, variant.paper]
			.map((value) => value?.trim().toLowerCase())
			.filter((value): value is string => Boolean(value))
	);
}

function printLabelSource(variant: GalleryCommerceVariant): string {
	return [printSizeSource(variant), variant.title, variant.format]
		.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
		.join(' · ');
}

function sizeLabel(variant: GalleryCommerceVariant): string {
	if (variant.digital) {
		const format = (variant.format ?? '').trim();
		if (!format || /digital/i.test(format)) return 'Download';
		return formatPrintOfferLabel(format);
	}
	return formatPrintOfferLabel(printLabelSource(variant));
}

/**
 * One paper-type chip from the SKU: the lab code when present (LPP, HPR),
 * otherwise a human name that is not the offering-set heading. Empty if
 * nothing extra is specified.
 */
export function paperChipsForVariant(variant: GalleryCommerceVariant): string[] {
	if (variant.digital) return [];
	const skip = skipPaperChipTokens(variant);
	const names: string[] = [];
	const codes: string[] = [];
	const seen = new Set<string>();
	for (const part of extraPrintLabelParts(printLabelSource(variant))) {
		const key = part.toLowerCase();
		if (skip.has(key) || seen.has(key)) continue;
		seen.add(key);
		if (PAPER_CODE.test(part)) codes.push(part.toUpperCase());
		else names.push(part);
	}
	return codes.length > 0 ? codes : names;
}

function listingIdentity(offer: Pick<ShopOffer, 'title' | 'paperChips'>): string {
	if (offer.paperChips.length === 0) return offer.title;
	return `${offer.title}::${offer.paperChips.join('·')}`;
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
			paperChips: paperChipsForVariant(variant),
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

/** One row per unique size + paper chips, preserving size sort from the grouped offers. */
export function listingsForGroup(group: ShopOfferGroup): ShopSizeListing[] {
	const byKey = new Map<string, ShopSizeListing>();
	for (const offer of group.offers) {
		const key = listingIdentity(offer);
		const existing = byKey.get(key);
		if (existing) {
			existing.offers.push(offer);
			continue;
		}
		byKey.set(key, {
			title: offer.title,
			paperChips: offer.paperChips,
			offers: [offer]
		});
	}
	return [...byKey.values()];
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
	return new Set(offers.map(listingIdentity)).size;
}

export function offerIsPurchasable(priceUSD: number | null | undefined): boolean {
	return typeof priceUSD === 'number' && Number.isFinite(priceUSD) && priceUSD > 0;
}

export function formatUsd(amount: number): string {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export type ShopGlossaryChipKind = 'paper' | 'crop' | 'low';

export type ShopGlossaryItem = {
	term: string;
	meaning: string;
	chipKind?: ShopGlossaryChipKind;
};

export type ShopGlossaryEntry = {
	term: string;
	meaning: string;
	items?: ShopGlossaryItem[];
};

const GSM_IN_TITLE = /\d+\s*gsm/i;

const FINISH_COPY: Record<string, string> = {
	gloss: 'Shiny coating with punchy colour. Shows reflections more easily.',
	lustre: 'Soft sheen — less glare than gloss, still rich colour.',
	matte: 'No sheen, so it reads well in bright rooms. Colour is a little softer.',
	metallic: 'Pearlescent surface that adds shimmer, especially in highlights.',
	standard: 'The paper’s default surface when no special coating is listed.'
};

const PAPER_CODE_COPY: Record<string, string> = {
	lpp: 'Lustre photo paper — the lab’s photographic stock.',
	hpr: 'Hahnemühle Photo Rag — a heavy cotton fine-art rag.',
	gpp: 'Gloss photo paper.',
	gpr: 'Gloss photo rag.'
};

export function paperChipLabel(chip: string): string {
	return PAPER_CODE_COPY[chip.toLowerCase()] ?? chip;
}

function collectFinishes(groups: ShopOfferGroup[]): string[] {
	const named = new Set<string>();
	let hasStandard = false;
	for (const group of groups) {
		if (group.kind !== 'print') continue;
		for (const listing of listingsForGroup(group)) {
			const options = finishOptionsForOffers(listing.offers);
			if (options.length === 0) continue;
			for (const option of options) {
				if (!option.value) hasStandard = true;
				else named.add(option.label);
			}
		}
	}
	const labels = [...named].sort((a, b) => a.localeCompare(b));
	if (hasStandard) labels.push('Standard');
	return labels;
}

function examplePaperChip(groups: ShopOfferGroup[]): string | null {
	for (const group of groups) {
		if (group.kind !== 'print') continue;
		for (const offer of group.offers) {
			if (offer.paperChips[0]) return offer.paperChips[0];
		}
	}
	return null;
}

/** Terms to explain above the offering sets, based on what this listing actually has. */
export function shopGlossary(groups: ShopOfferGroup[]): ShopGlossaryEntry[] {
	const printGroups = groups.filter((group) => group.kind === 'print');
	if (printGroups.length === 0) return [];

	const entries: ShopGlossaryEntry[] = [];

	const finishes = collectFinishes(printGroups);
	if (finishes.length > 0) {
		entries.push({
			term: 'Finish',
			meaning: 'The coating on the print. Choose one from the Finish menu after the size.',
			items: finishes.map((name) => ({
				term: name,
				meaning: FINISH_COPY[name.toLowerCase()] ?? 'A surface option for this paper.'
			}))
		});
	}

	if (printGroups.some((group) => group.offers.some((offer) => GSM_IN_TITLE.test(offer.title)))) {
		entries.push({
			term: 'gsm',
			meaning:
				'Paper weight in grams per square metre. Higher is thicker and stiffer. 240gsm is typical photo paper; 308gsm is a heavier fine-art sheet.'
		});
	}

	const paperChip = examplePaperChip(printGroups);
	const chipItems: ShopGlossaryItem[] = [];
	if (paperChip) {
		chipItems.push({
			term: paperChip,
			meaning: 'Extra paper type or grade for that size, when the SKU specifies one.',
			chipKind: 'paper'
		});
	}
	chipItems.push(
		{
			term: 'Crop',
			meaning: 'This size will trim the photo. Tap for a preview.',
			chipKind: 'crop'
		},
		{
			term: 'Low res',
			meaning: 'The file is below the recommended print resolution. Tap for a preview.',
			chipKind: 'low'
		}
	);
	entries.push({
		term: 'Chips',
		meaning: 'These labels can appear next to a size.',
		items: chipItems
	});

	return entries;
}
