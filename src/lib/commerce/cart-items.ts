export type CartLine = {
	variantId: string;
	quantity: number;
};

export const MAX_CART_QTY = 99;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Floor and clamp a qty input. Invalid values become 0. */
export function clampQuantity(value: unknown): number {
	const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(MAX_CART_QTY, Math.floor(n)));
}

/**
 * Accept either `{ items: [{ variantId, quantity }] }` or the legacy
 * `{ variantId, quantity }` body. Returns null when nothing valid is present.
 * Legacy missing/invalid quantity still defaults to 1.
 */
export function parseCartAddBody(body: unknown): CartLine[] | null {
	if (!isRecord(body)) return null;

	if (Array.isArray(body.items)) {
		const lines: CartLine[] = [];
		for (const item of body.items) {
			if (!isRecord(item) || typeof item.variantId !== 'string' || !item.variantId) continue;
			const quantity = clampQuantity(item.quantity);
			if (quantity > 0) lines.push({ variantId: item.variantId, quantity });
		}
		return lines.length > 0 ? lines : null;
	}

	if (typeof body.variantId === 'string' && body.variantId) {
		const quantity = clampQuantity(body.quantity);
		return [{ variantId: body.variantId, quantity: quantity > 0 ? quantity : 1 }];
	}

	return null;
}
