import { browser } from '$app/environment';
import {
	parseCartSummary,
	readStoredCart,
	writeStoredCart,
	type CartSummary
} from './cart-session';
import { applyShopEnvironment } from './ecommerce-environment.svelte';

const ADDED_NOTICE_MS = 5000;

export const cartUi = $state({
	itemCount: 0,
	cartUrl: null as string | null,
	addedQty: 0,
	hydrated: false
});

let addedTimer: ReturnType<typeof setTimeout> | null = null;
let localRevision = 0;

function applySummary(summary: CartSummary, addedQty = 0) {
	cartUi.itemCount = summary.itemCount;
	cartUi.cartUrl = summary.cartUrl;
	cartUi.hydrated = true;
	if (addedQty > 0) {
		cartUi.addedQty = addedQty;
		if (addedTimer) clearTimeout(addedTimer);
		addedTimer = setTimeout(() => {
			cartUi.addedQty = 0;
			addedTimer = null;
		}, ADDED_NOTICE_MS);
	}
	writeStoredCart(summary);
}

export function rememberCartAdd(summary: CartSummary, addedQty: number) {
	localRevision += 1;
	applySummary(summary, addedQty);
}

export async function hydrateCartSession(): Promise<void> {
	if (!browser) return;

	if (!cartUi.hydrated) {
		const stored = readStoredCart();
		if (stored) applySummary(stored);
	}

	const revision = localRevision;
	try {
		const res = await fetch('/api/cart');
		if (!res.ok) return;
		if (revision !== localRevision) return;
		const data: unknown = await res.json();
		if (revision !== localRevision) return;
		applyShopEnvironment(data);
		const summary = parseCartSummary(data);
		if (revision !== localRevision) return;
		if (summary) applySummary(summary);
	} catch {
		/* keep whatever we already have */
	}
}
