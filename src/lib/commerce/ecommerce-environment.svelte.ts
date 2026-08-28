import { browser } from '$app/environment';
import { parseEcommerceEnvironment, sandboxWarningCopy } from './ecommerce-environment';

export const shopEnvironment = $state({
	loaded: false,
	isSandbox: false,
	warning: null as string | null
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Apply Medusa flags from `/api/cart` (`environment`) or a bare status object. */
export function applyShopEnvironment(payload: unknown) {
	const nested =
		isRecord(payload) && payload.environment !== undefined ? payload.environment : payload;
	const status = parseEcommerceEnvironment(nested);
	shopEnvironment.loaded = true;
	if (!status?.is_sandbox) {
		shopEnvironment.isSandbox = false;
		shopEnvironment.warning = null;
		return;
	}
	shopEnvironment.isSandbox = true;
	shopEnvironment.warning = sandboxWarningCopy();
}

let inflight: Promise<void> | null = null;

/** Load store sandbox/live flags once per session. Fail closed (no banner). */
export async function hydrateShopEnvironment(): Promise<void> {
	if (!browser || shopEnvironment.loaded) return;
	if (inflight) return inflight;

	inflight = (async () => {
		try {
			const res = await fetch('/api/cart');
			if (!res.ok) return;
			applyShopEnvironment(await res.json());
		} catch {
			/* keep live (no banner) */
		} finally {
			shopEnvironment.loaded = true;
			inflight = null;
		}
	})();

	return inflight;
}
