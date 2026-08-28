import { json } from '@sveltejs/kit';
import {
	CART_COOKIE,
	CART_COOKIE_MAX_AGE,
	cartCookieDomain,
	shopCartUrl
} from '$lib/commerce/cart-http.server';
import {
	cartQuantity,
	isPaymentSessionStuckError,
	mergeCartLines,
	parseCartAddBody,
	type CartLine
} from '$lib/commerce/cart-items';
import {
	addLineItem,
	cartHasPaymentSessions,
	cartIsCompleted,
	createCart,
	getCart,
	getStoreConfig,
	linesFromStoreCart
} from '$lib/medusa/store.server';
import type { RequestHandler } from './$types';

/**
 * Add a Medusa product variant to the shopper's cart.
 *
 * The site stays put after add. `redirectUrl` is for an explicit “View cart”
 * handoff. Cookie sharing is best-effort (`_medusa_cart_id` on `.itsmillertime.dev`).
 * Local www → production shop cannot see that cookie, and the shop's own
 * host-only cart cookie will shadow it, so the URL also passes `cart_id`.
 */

async function addLines(cfg: ReturnType<typeof getStoreConfig>, cartId: string, items: CartLine[]) {
	for (const item of items) {
		await addLineItem(cfg, cartId, item.variantId, item.quantity);
	}
}

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const items = parseCartAddBody(body);
	if (!items) {
		return json({ error: 'At least one item with quantity is required' }, { status: 400 });
	}

	let cfg: ReturnType<typeof getStoreConfig>;
	try {
		cfg = getStoreConfig();
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Medusa not configured' },
			{ status: 503 }
		);
	}

	try {
		let cartId = cookies.get(CART_COOKIE) ?? null;
		let existing = cartId ? await getCart(cfg, cartId) : null;
		const priorLines = existing && !cartIsCompleted(existing) ? linesFromStoreCart(existing) : [];

		// Completed carts cannot take new items. Carts that already started
		// checkout often cannot delete payment sessions, so adding a line 500s.
		if (existing && (cartIsCompleted(existing) || cartHasPaymentSessions(existing))) {
			const snapshot = cartIsCompleted(existing) ? [] : priorLines;
			cartId = await createCart(cfg);
			await addLines(cfg, cartId, mergeCartLines(snapshot, items));
		} else {
			if (!existing) {
				cartId = await createCart(cfg);
			} else {
				cartId = existing.id;
			}

			try {
				await addLines(cfg, cartId, items);
			} catch (err) {
				if (!isPaymentSessionStuckError(err)) throw err;
				const snapshot = existing ? linesFromStoreCart(existing) : [];
				cartId = await createCart(cfg);
				await addLines(cfg, cartId, mergeCartLines(snapshot, items));
			}
		}

		if (!cartId) {
			throw new Error('Cart was not created');
		}

		cookies.set(CART_COOKIE, cartId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			domain: cartCookieDomain(url.host),
			maxAge: CART_COOKIE_MAX_AGE
		});

		return json({
			ok: true,
			cartId,
			itemCount: cartQuantity(mergeCartLines(priorLines, items)),
			redirectUrl: shopCartUrl(cartId)
		});
	} catch (err) {
		console.error('[cart/add]', err);
		return json({ error: 'Failed to add to cart' }, { status: 502 });
	}
};
