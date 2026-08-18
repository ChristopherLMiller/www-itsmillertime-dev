import type { CartLine } from './cart-items';

export type { CartLine };

/**
 * Add Medusa variants to the shopper cart, then hand off to the storefront.
 */
export async function addVariantsToCart(
	items: CartLine[]
): Promise<{ redirectUrl: string | null }> {
	const res = await fetch('/api/cart/add', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ items })
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = (await res.json()) as { redirectUrl?: string | null };
	return { redirectUrl: data.redirectUrl ?? null };
}

export async function addVariantToCart(
	variantId: string,
	quantity = 1
): Promise<{ redirectUrl: string | null }> {
	return addVariantsToCart([{ variantId, quantity }]);
}
