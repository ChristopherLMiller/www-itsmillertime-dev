import { env } from '$env/dynamic/private';
import { parseStoreProduct, type PublicProduct } from './store-product';

export type { PublicProduct, StoreCommerceVariant } from './store-product';

/**
 * Server-only Medusa Store API client used by the add-to-cart handoff.
 *
 * Authenticates with the publishable API key (scoped to the storefront sales
 * channel). We create/populate a cart on the Medusa backend, then hand the user
 * off to the storefront to check out.
 */

interface StoreConfig {
	backendUrl: string;
	publishableKey: string;
	regionId?: string;
}

export function getStoreConfig(): StoreConfig {
	const backendUrl = env.MEDUSA_BACKEND_URL;
	const publishableKey = env.MEDUSA_PUBLISHABLE_KEY;

	if (!backendUrl || !publishableKey) {
		throw new Error(
			'Medusa is not configured. Set MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_KEY.'
		);
	}

	return {
		backendUrl: backendUrl.replace(/\/$/, ''),
		publishableKey,
		regionId: env.MEDUSA_REGION_ID || undefined
	};
}

async function storeFetch<T>(cfg: StoreConfig, path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${cfg.backendUrl}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			'x-publishable-api-key': cfg.publishableKey,
			...(init?.headers ?? {})
		}
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Medusa store ${init?.method ?? 'GET'} ${path} -> ${res.status} ${text}`);
	}

	return (await res.json()) as T;
}

interface StoreCart {
	id: string;
}

/** Create a new cart (optionally region-scoped) and return its id. */
export async function createCart(cfg: StoreConfig): Promise<string> {
	const { cart } = await storeFetch<{ cart: StoreCart }>(cfg, '/store/carts', {
		method: 'POST',
		body: JSON.stringify(cfg.regionId ? { region_id: cfg.regionId } : {})
	});
	return cart.id;
}

/** Return the cart if it still exists and is usable, else null. */
export async function getCart(cfg: StoreConfig, cartId: string): Promise<StoreCart | null> {
	try {
		const { cart } = await storeFetch<{ cart: StoreCart }>(cfg, `/store/carts/${cartId}`);
		return cart ?? null;
	} catch {
		return null;
	}
}

/** Add a variant to the cart as a line item. */
export async function addLineItem(
	cfg: StoreConfig,
	cartId: string,
	variantId: string,
	quantity = 1
): Promise<void> {
	await storeFetch(cfg, `/store/carts/${cartId}/line-items`, {
		method: 'POST',
		body: JSON.stringify({ variant_id: variantId, quantity })
	});
}

/**
 * Look up a published storefront product by id (Medusa is the source of truth).
 * The Store API only returns published products in the key's sales channel, so a
 * `null` result means the image is not currently for sale.
 */
export async function getStoreProduct(
	cfg: StoreConfig,
	productId: string
): Promise<PublicProduct | null> {
	// Request variants + calculated_price explicitly. Selecting only
	// `id,title,*variants.calculated_price` can omit variant ids after the
	// Paper/Format offering-set shape landed.
	const query = new URLSearchParams({
		fields:
			'*variants.calculated_price,*variants,*variants.metadata,*variants.options,*variants.options.option,+variants.manage_inventory'
	});
	if (cfg.regionId) query.set('region_id', cfg.regionId);

	try {
		const payload = await storeFetch<unknown>(
			cfg,
			`/store/products/${productId}?${query.toString()}`
		);
		return parseStoreProduct(payload);
	} catch {
		return null;
	}
}
