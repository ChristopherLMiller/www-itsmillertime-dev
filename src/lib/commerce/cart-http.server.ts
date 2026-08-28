import { env as pub } from '$env/dynamic/public';

export const CART_COOKIE = '_medusa_cart_id';
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Share the cart cookie across subdomains in production; omit on localhost. */
export function cartCookieDomain(host: string): string | undefined {
	const hostname = host.split(':')[0];
	if (hostname.endsWith('itsmillertime.dev')) {
		return '.itsmillertime.dev';
	}
	return undefined;
}

export function shopCartUrl(cartId: string): string | null {
	const shopUrl = (pub.PUBLIC_SHOP_URL ?? '').replace(/\/$/, '');
	if (!shopUrl) return null;
	return `${shopUrl}/cart?cart_id=${encodeURIComponent(cartId)}`;
}
