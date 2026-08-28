import { json } from '@sveltejs/kit';
import { CART_COOKIE, shopCartUrl } from '$lib/commerce/cart-http.server';
import { cartQuantity } from '$lib/commerce/cart-items';
import {
	cartIsCompleted,
	getCart,
	getEcommerceEnvironment,
	getStoreConfig,
	linesFromStoreCart
} from '$lib/medusa/store.server';
import type { RequestHandler } from './$types';

/**
 * Current shopper cart summary for the on-site cart indicator.
 * Does not create a cart — missing/completed carts look empty.
 * Also returns Medusa sandbox/live flags for the gallery shop tab.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	const cartId = cookies.get(CART_COOKIE) ?? null;

	let cfg: ReturnType<typeof getStoreConfig> | null = null;
	try {
		cfg = getStoreConfig();
	} catch {
		if (!cartId) {
			return json({
				ok: true,
				itemCount: 0,
				cartId: null,
				redirectUrl: null,
				environment: null
			});
		}
		return json({ error: 'Medusa not configured' }, { status: 503 });
	}

	const environmentPromise = getEcommerceEnvironment(cfg);

	if (!cartId) {
		return json({
			ok: true,
			itemCount: 0,
			cartId: null,
			redirectUrl: null,
			environment: await environmentPromise
		});
	}

	try {
		const [cart, environment] = await Promise.all([getCart(cfg, cartId), environmentPromise]);
		if (!cart || cartIsCompleted(cart)) {
			return json({
				ok: true,
				itemCount: 0,
				cartId: null,
				redirectUrl: null,
				environment
			});
		}

		return json({
			ok: true,
			itemCount: cartQuantity(linesFromStoreCart(cart)),
			cartId: cart.id,
			redirectUrl: shopCartUrl(cart.id),
			environment
		});
	} catch (err) {
		console.error('[cart]', err);
		return json({ error: 'Failed to load cart' }, { status: 502 });
	}
};
