import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';

export type ShopOffer = {
	variantId: string;
	/** Size / format shown on the button (e.g. "8×10"). */
	title: string;
	priceUSD: number | null;
};

export type ShopOfferGroup = {
	id: string;
	name: string;
	kind: 'digital' | 'print';
	offers: ShopOffer[];
};

const SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i;

export function displaySizeLabel(value: string | null | undefined): string {
	const raw = (value ?? '').trim();
	if (!raw) return 'Print';
	return raw.replace(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/g, '$1×$2');
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
		const format = displaySizeLabel(variant.format);
		if (!variant.format || /digital/i.test(variant.format)) return 'Download';
		return format;
	}
	return displaySizeLabel(variant.format ?? variant.title);
}

/**
 * Group store variants by paper / offering set. Format becomes the size
 * buttons inside each group. Digital is treated as its own paper type.
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
		if (existing) {
			existing.offers.push(offer);
			continue;
		}
		byPaper.set(name, {
			id: kind === 'digital' ? 'digital' : `print:${name}`,
			name,
			kind,
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
