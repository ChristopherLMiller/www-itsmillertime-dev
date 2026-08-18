import { env as pub } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import { parseCartAddBody } from '$lib/commerce/cart-items';
import { addLineItem, createCart, getCart, getStoreConfig } from '$lib/medusa/store.server';
import type { RequestHandler } from './$types';

/**
 * Add a Medusa product variant to the shopper's cart, then hand off to the
 * storefront for checkout.
 *
 * Cookie sharing is best-effort (`_medusa_cart_id` on `.itsmillertime.dev`).
 * Local www → production shop cannot see that cookie, and the shop's own
 * host-only cart cookie will shadow it, so the redirect also passes `cart_id`.
 */

const CART_COOKIE = '_medusa_cart_id';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Share the cart cookie across subdomains in production; omit on localhost. */
function cookieDomain(host: string): string | undefined {
	const hostname = host.split(':')[0];
	if (hostname.endsWith('itsmillertime.dev')) {
		return '.itsmillertime.dev';
	}
	return undefined;
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

		// Validate an existing cart id; drop it if the cart is gone.
		if (cartId) {
			const existing = await getCart(cfg, cartId);
			if (!existing) cartId = null;
		}

		if (!cartId) {
			cartId = await createCart(cfg);
		}

		for (const item of items) {
			await addLineItem(cfg, cartId, item.variantId, item.quantity);
		}

		cookies.set(CART_COOKIE, cartId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			domain: cookieDomain(url.host),
			maxAge: THIRTY_DAYS
		});

		const shopUrl = (pub.PUBLIC_SHOP_URL ?? '').replace(/\/$/, '');
		const redirectUrl = shopUrl
			? `${shopUrl}/cart?cart_id=${encodeURIComponent(cartId)}`
			: null;

		return json({ ok: true, cartId, redirectUrl });
	} catch (err) {
		console.error('[cart/add]', err);
		return json({ error: 'Failed to add to cart' }, { status: 502 });
	}
};
