/**
 * Parse a Medusa Store API product payload into the shape the gallery shop tab uses.
 *
 * Products now have Paper × Format options (digital download plus print sizes).
 * Older code assumed `variants[0]` was the digital SKU and that
 * `calculated_price.calculated_amount` was always present — both broke after
 * the offering-set product shape landed.
 */

export type StoreCommerceVariant = {
	variantId: string;
	title: string;
	priceUSD: number | null;
	digital: boolean;
	/** Offering set / paper type (e.g. "Photo Rag"). Null for digital. */
	paper: string | null;
	/** Offering set description for this paper type. */
	paperDescription: string | null;
	/** Size / format (e.g. "11x14"). */
	format: string | null;
	/** Prodigi paper finish (e.g. "Gloss"). Null when Standard or unset. */
	finish: string | null;
};

export type PublicProduct = {
	productId: string;
	variantId: string | null;
	priceUSD: number | null;
	variants: StoreCommerceVariant[];
};

export type OfferingSetInfo = {
	name: string;
	description: string | null;
};

const PROCESSING_PRICE_KEYS = [
	'calculated_amount',
	'calculated_amount_with_tax',
	'original_amount',
	'amount'
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveAmount(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
	return value;
}

function readAmount(variant: Record<string, unknown>): number | null {
	const cp = variant.calculated_price;
	if (isRecord(cp)) {
		for (const key of PROCESSING_PRICE_KEYS) {
			const n = positiveAmount(cp[key]);
			if (n != null) return n;
		}
	}
	const prices = variant.prices;
	if (Array.isArray(prices)) {
		for (const price of prices) {
			if (!isRecord(price)) continue;
			const n = positiveAmount(price.amount);
			if (n != null) return n;
		}
	}
	return null;
}

type OptionEntry = { title: string | null; value: string };

function optionEntries(variant: Record<string, unknown>): OptionEntry[] {
	const opts = variant.options;
	if (!Array.isArray(opts)) return [];
	const entries: OptionEntry[] = [];
	for (const opt of opts) {
		if (typeof opt === 'string' && opt.trim()) {
			entries.push({ title: null, value: opt.trim() });
			continue;
		}
		if (!isRecord(opt)) continue;
		const value =
			typeof opt.value === 'string' && opt.value.trim()
				? opt.value.trim()
				: typeof opt.title === 'string' && opt.title.trim() && !isRecord(opt.option)
					? opt.title.trim()
					: '';
		if (!value) continue;
		const nested = opt.option;
		const axis =
			isRecord(nested) && typeof nested.title === 'string' && nested.title.trim()
				? nested.title.trim()
				: null;
		entries.push({ title: axis, value });
	}
	return entries;
}

function optionValues(variant: Record<string, unknown>): string[] {
	return optionEntries(variant).map((e) => e.value);
}

function isFinishAxis(axis: string | null | undefined): boolean {
	const value = axis?.toLowerCase() ?? '';
	return value === 'finish' || value === 'paper finish';
}

/** Placeholder Medusa uses when a product has Finish but this SKU has none. */
const HIDDEN_FINISH = /^(standard|none|n\/a|default)$/i;

function titleCaseFinish(value: string): string {
	return value.replace(
		/\S+/g,
		(word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
	);
}

export function displayFinish(finish: string | null | undefined): string | null {
	const value = finish?.trim() ?? '';
	if (!value || HIDDEN_FINISH.test(value)) return null;
	return titleCaseFinish(value);
}

export function paperAndFormat(
	variant: Record<string, unknown>,
	digital: boolean
): { paper: string | null; format: string | null; finish: string | null } {
	const entries = optionEntries(variant);
	let paper: string | null = null;
	let format: string | null = null;
	let finish: string | null = null;
	for (const entry of entries) {
		const axis = entry.title?.toLowerCase();
		if (axis === 'paper') paper = entry.value;
		if (axis === 'format') format = entry.value;
		if (isFinishAxis(axis)) finish = entry.value;
	}
	if (!paper && !format) {
		const values = entries
			.map((e) => e.value)
			.filter((v) => {
				const lower = v.toLowerCase();
				return lower !== 'paper' && lower !== 'format' && !isFinishAxis(lower);
			});
		if (values.length >= 2) {
			paper = values[0] ?? null;
			format = values[1] ?? null;
			finish = values[2] ?? finish;
		} else if (values.length === 1) {
			format = values[0] ?? null;
		}
	}
	if (!finish && isRecord(variant.metadata)) {
		const metaFinish = variant.metadata.prodigi_finish;
		if (typeof metaFinish === 'string' && metaFinish.trim()) finish = metaFinish.trim();
	}
	if (digital) {
		return {
			paper: null,
			format:
				format && format.toLowerCase() !== 'digital' && format.toLowerCase() !== 'digital download'
					? format
					: 'Digital download',
			finish: null
		};
	}
	if (paper && paper.toLowerCase() === 'digital') paper = null;
	const title = typeof variant.title === 'string' ? variant.title.trim() : '';
	return {
		paper,
		format: format ?? (title && title.toLowerCase() !== 'default' ? title : null),
		finish: displayFinish(finish)
	};
}

export function isDigitalStoreVariant(variant: Record<string, unknown>): boolean {
	const meta = variant.metadata;
	if (isRecord(meta)) {
		if (meta.fulfillment_type === 'digital' || meta.is_digital === true) return true;
		if (meta.fulfillment_type === 'print' || meta.is_digital === false) return false;
	}
	const values = optionValues(variant).map((v) => v.toLowerCase());
	const hasPrintSize = values.some((v) => /\d+\s*[x×]\s*\d+/i.test(v));
	if (hasPrintSize) return false;
	if (values.includes('digital download')) return true;
	if (values.includes('digital') && values.some((v) => v.includes('download'))) return true;
	const title = typeof variant.title === 'string' ? variant.title.toLowerCase() : '';
	if (title.includes('digital download')) return true;
	// Made-to-order prints often have manage_inventory: false — only treat that as
	// digital when there are no product options at all (legacy single SKU).
	if (values.length === 0 && variant.manage_inventory === false) return true;
	return false;
}

function variantTitle(variant: Record<string, unknown>, digital: boolean): string {
	if (typeof variant.title === 'string') {
		const title = variant.title.trim();
		if (title && title.toLowerCase() !== 'default') return title;
	}
	const values = optionValues(variant).filter((v) => {
		const lower = v.toLowerCase();
		return lower !== 'paper' && lower !== 'format';
	});
	if (values.length) return values.join(' · ');
	return digital ? 'Digital download' : 'Print';
}

/**
 * Accept either `{ product }` (Store retrieve) or a bare product object.
 * Returns null when there is no product id or no variants with ids.
 */
export function parseStoreProduct(payload: unknown): PublicProduct | null {
	if (!isRecord(payload)) return null;
	const product = isRecord(payload.product) ? payload.product : payload;
	if (typeof product.id !== 'string' || !product.id) return null;

	const rawVariants = Array.isArray(product.variants) ? product.variants : [];
	const variants: StoreCommerceVariant[] = [];
	for (const raw of rawVariants) {
		if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) continue;
		const digital = isDigitalStoreVariant(raw);
		const axes = paperAndFormat(raw, digital);
		variants.push({
			variantId: raw.id,
			title: variantTitle(raw, digital),
			priceUSD: readAmount(raw),
			digital,
			paper: axes.paper,
			paperDescription: null,
			format: axes.format,
			finish: axes.finish
		});
	}

	if (variants.length === 0) return null;

	const primary = variants.find((v) => v.digital) ?? variants[0];
	return {
		productId: product.id,
		variantId: primary.variantId,
		priceUSD: primary.priceUSD,
		variants
	};
}

function readDescription(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/** Offering sets from a Store product payload, if the retrieve included the link. */
export function readOfferingSets(payload: unknown): OfferingSetInfo[] {
	if (!isRecord(payload)) return [];
	const product = isRecord(payload.product) ? payload.product : payload;
	const raw = product.offering_sets;
	if (!Array.isArray(raw)) return [];

	const sets: OfferingSetInfo[] = [];
	for (const entry of raw) {
		if (!isRecord(entry) || typeof entry.name !== 'string' || !entry.name.trim()) continue;
		sets.push({
			name: entry.name.trim(),
			description: readDescription(entry.description)
		});
	}
	return sets;
}

/**
 * Attach offering-set descriptions onto print variants by matching set name to
 * the Paper option (apply-offering-set uses the set name as the paper value).
 */
export function applyOfferingSetDescriptions(
	product: PublicProduct,
	sets: OfferingSetInfo[]
): PublicProduct {
	if (sets.length === 0) return product;

	const byPaper = new Map<string, string | null>();
	for (const set of sets) {
		byPaper.set(set.name.trim().toLowerCase(), set.description);
	}

	return {
		...product,
		variants: product.variants.map((variant) => {
			if (variant.digital || !variant.paper) return variant;
			const description = byPaper.get(variant.paper.trim().toLowerCase());
			if (description === undefined) return variant;
			return { ...variant, paperDescription: description };
		})
	};
}
