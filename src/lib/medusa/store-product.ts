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
	/** Size / format (e.g. "11x14"). */
	format: string | null;
};

export type PublicProduct = {
	productId: string;
	variantId: string | null;
	priceUSD: number | null;
	variants: StoreCommerceVariant[];
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

function readAmount(variant: Record<string, unknown>): number | null {
	const cp = variant.calculated_price;
	if (isRecord(cp)) {
		for (const key of PROCESSING_PRICE_KEYS) {
			const n = cp[key];
			if (typeof n === 'number' && Number.isFinite(n)) return n;
		}
	}
	const prices = variant.prices;
	if (Array.isArray(prices)) {
		for (const price of prices) {
			if (isRecord(price) && typeof price.amount === 'number' && Number.isFinite(price.amount)) {
				return price.amount;
			}
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

export function paperAndFormat(
	variant: Record<string, unknown>,
	digital: boolean
): { paper: string | null; format: string | null } {
	const entries = optionEntries(variant);
	let paper: string | null = null;
	let format: string | null = null;
	for (const entry of entries) {
		const axis = entry.title?.toLowerCase();
		if (axis === 'paper') paper = entry.value;
		if (axis === 'format') format = entry.value;
	}
	if (!paper && !format) {
		const values = entries
			.map((e) => e.value)
			.filter((v) => {
				const lower = v.toLowerCase();
				return lower !== 'paper' && lower !== 'format';
			});
		if (values.length >= 2) {
			paper = values[0] ?? null;
			format = values[1] ?? null;
		} else if (values.length === 1) {
			format = values[0] ?? null;
		}
	}
	if (digital) {
		return {
			paper: null,
			format:
				format && format.toLowerCase() !== 'digital' && format.toLowerCase() !== 'digital download'
					? format
					: 'Digital download'
		};
	}
	if (paper && paper.toLowerCase() === 'digital') paper = null;
	const title = typeof variant.title === 'string' ? variant.title.trim() : '';
	return {
		paper,
		format: format ?? (title && title.toLowerCase() !== 'default' ? title : null)
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
			format: axes.format
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
