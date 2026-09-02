import type { ShopLinkStatus } from './types';

export type { ShopLinkStatus };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

export const CMS_ACCOUNT_LINK = {
	status: '/account-link/shop/status',
	start: '/account-link/shop/start',
	confirm: '/account-link/shop/confirm',
	unlink: '/account-link/shop/unlink',
	orders: '/account-link/shop/orders'
} as const;

export function parseShopLinkStatus(raw: unknown, error: string | null = null): ShopLinkStatus {
	if (!isRecord(raw)) {
		return {
			linked: false,
			medusa_customer_id: null,
			medusa_customer_email: null,
			linked_at: null,
			error
		};
	}

	return {
		linked: Boolean(raw.linked),
		medusa_customer_id: readString(raw.medusa_customer_id),
		medusa_customer_email: readString(raw.medusa_customer_email),
		linked_at: readString(raw.linked_at),
		error: error ?? readString(raw.error) ?? readString(raw.message)
	};
}

export function emptyShopLinkStatus(error: string | null = null): ShopLinkStatus {
	return parseShopLinkStatus(null, error);
}

export type ShopOrderView = {
	number: string;
	placedAt: string | null;
	status: string | null;
	totalLabel: string | null;
	itemCount: number | null;
};

function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
		return Number(value);
	}
	return null;
}

function formatMoney(amount: number | null, currency: string | null): string | null {
	if (amount == null) return null;
	const code = (currency ?? 'USD').toUpperCase();
	try {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
	} catch {
		return `${amount} ${code}`;
	}
}

function parseShopOrder(raw: unknown): ShopOrderView | null {
	if (!isRecord(raw)) return null;
	const display =
		readString(raw.display_id) ??
		(typeof raw.display_id === 'number' ? String(raw.display_id) : null) ??
		readString(raw.number);
	const total =
		readNumber(raw.total) ??
		readNumber(raw.summary && isRecord(raw.summary) ? raw.summary.current_order_total : null);
	const currency =
		readString(raw.currency_code) ??
		(isRecord(raw.currency) ? readString(raw.currency.code) : null);
	const items = Array.isArray(raw.items)
		? raw.items
		: Array.isArray(raw.line_items)
			? raw.line_items
			: null;
	return {
		number: display ? `Order ${display}` : 'Order',
		placedAt: readString(raw.created_at) ?? readString(raw.placed_at),
		status: readString(raw.status) ?? readString(raw.fulfillment_status),
		totalLabel: formatMoney(total, currency),
		itemCount: items ? items.length : readNumber(raw.item_count)
	};
}

export function parseShopOrders(raw: unknown): ShopOrderView[] {
	const list = Array.isArray(raw)
		? raw
		: isRecord(raw) && Array.isArray(raw.orders)
			? raw.orders
			: isRecord(raw) && Array.isArray(raw.docs)
				? raw.docs
				: [];
	const orders: ShopOrderView[] = [];
	for (const item of list) {
		const parsed = parseShopOrder(item);
		if (parsed) orders.push(parsed);
	}
	return orders;
}
