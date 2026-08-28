export type EcommerceEnvironment = 'sandbox' | 'live';

export type EcommerceEnvironmentStatus = {
	environment: EcommerceEnvironment;
	is_sandbox: boolean;
	prodigi: {
		environment: EcommerceEnvironment;
		api_url: string;
	};
	stripe: {
		environment: EcommerceEnvironment;
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readEnvironment(value: unknown): EcommerceEnvironment | null {
	return value === 'sandbox' || value === 'live' ? value : null;
}

/** Parse `GET /store/ecommerce-environment` (or `/api/cart`'s `environment` field). */
export function parseEcommerceEnvironment(payload: unknown): EcommerceEnvironmentStatus | null {
	if (!isRecord(payload)) return null;
	const environment = readEnvironment(payload.environment);
	if (!environment || typeof payload.is_sandbox !== 'boolean') return null;
	if (!isRecord(payload.prodigi) || !isRecord(payload.stripe)) return null;
	const prodigiEnvironment = readEnvironment(payload.prodigi.environment);
	const stripeEnvironment = readEnvironment(payload.stripe.environment);
	if (!prodigiEnvironment || !stripeEnvironment) return null;
	const apiUrl =
		typeof payload.prodigi.api_url === 'string' ? payload.prodigi.api_url.trim() : '';

	return {
		environment,
		is_sandbox: payload.is_sandbox,
		prodigi: { environment: prodigiEnvironment, api_url: apiUrl },
		stripe: { environment: stripeEnvironment }
	};
}

/** Visitor-facing copy when the shop is not taking real orders. */
export const SANDBOX_WARNING_COPY =
	"I'm still trying the shop out. You can add things to your cart, but you won't be charged, and nothing will print or ship.";

export function sandboxWarningCopy(): string {
	return SANDBOX_WARNING_COPY;
}
