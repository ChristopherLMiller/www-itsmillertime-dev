import type { CartLine } from './cart-items';
import { cartQuantity } from './cart-items';
import { rememberCartAdd } from './cart-session.svelte';
import { parseCartSummary, type CartSummary } from './cart-session';

export type { CartLine, CartSummary };

/**
 * Add Medusa variants to the shopper cart. Stays on this site; the cart dock
 * and “View cart” link hand off to the shop when the shopper is ready.
 */
export async function addVariantsToCart(items: CartLine[]): Promise<CartSummary> {
	const res = await fetch('/api/cart/add', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ items })
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const summary = parseCartSummary(await res.json());
	if (!summary) throw new Error('Invalid cart response');
	rememberCartAdd(summary, cartQuantity(items));
	return summary;
}

export async function addVariantToCart(variantId: string, quantity = 1): Promise<CartSummary> {
	return addVariantsToCart([{ variantId, quantity }]);
}
