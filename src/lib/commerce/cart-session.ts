export type CartSummary = {
	itemCount: number;
	cartUrl: string | null;
};

/** Named browsing context so repeated “View cart” clicks reuse one shop tab. */
export const SHOP_CART_WINDOW = 'shop-cart';

export const CART_STORAGE_KEY = 'imt-cart';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse `{ itemCount, redirectUrl }` from `/api/cart` or `/api/cart/add`. */
export function parseCartSummary(data: unknown): CartSummary | null {
	if (!isRecord(data)) return null;
	if (typeof data.itemCount !== 'number' || !Number.isFinite(data.itemCount)) return null;
	const itemCount = Math.max(0, Math.floor(data.itemCount));
	const cartUrl =
		typeof data.redirectUrl === 'string' && data.redirectUrl.trim()
			? data.redirectUrl.trim()
			: null;
	return { itemCount, cartUrl };
}

export function readStoredCart(): CartSummary | null {
	try {
		const raw = sessionStorage.getItem(CART_STORAGE_KEY);
		if (!raw) return null;
		return parseCartSummary(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

export function writeStoredCart(summary: CartSummary): void {
	try {
		sessionStorage.setItem(
			CART_STORAGE_KEY,
			JSON.stringify({ itemCount: summary.itemCount, redirectUrl: summary.cartUrl })
		);
	} catch {
		/* quota / private mode */
	}
}
