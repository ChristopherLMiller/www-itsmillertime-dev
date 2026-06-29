import { env as pub } from '$env/dynamic/public';
import { json } from '@sveltejs/kit';
import { addLineItem, createCart, getCart, getStoreConfig } from '$lib/medusa/store.server';
import type { RequestHandler } from './$types';

/**
 * Add a Medusa product variant to the shopper's cart, then hand off to the
 * storefront for checkout.
 *
 * The cart id is stored in `_medusa_cart_id`, scoped to the parent domain
 * (`.itsmillertime.dev`) so the storefront subdomain picks up the same cart.
 * In local dev (localhost) cookies are shared across ports automatically.
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

	const { variantId, quantity } = (body ?? {}) as {
		variantId?: unknown;
		quantity?: unknown;
	};

	if (typeof variantId !== 'string' || variantId.length === 0) {
		return json({ error: 'variantId is required' }, { status: 400 });
	}

	const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;

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

		await addLineItem(cfg, cartId, variantId, qty);

		cookies.set(CART_COOKIE, cartId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			domain: cookieDomain(url.host),
			maxAge: THIRTY_DAYS
		});

		const shopUrl = (pub.PUBLIC_SHOP_URL ?? '').replace(/\/$/, '');
		const redirectUrl = shopUrl ? `${shopUrl}/cart` : null;

		return json({ ok: true, cartId, redirectUrl });
	} catch (err) {
		console.error('[cart/add]', err);
		return json({ error: 'Failed to add to cart' }, { status: 502 });
	}
};
