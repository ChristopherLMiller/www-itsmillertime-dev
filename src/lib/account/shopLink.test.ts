import { describe, expect, it } from 'vitest';
import { CMS_ACCOUNT_LINK, parseShopLinkStatus, parseShopOrders } from './shopLink';

describe('CMS_ACCOUNT_LINK', () => {
	it('uses Payload API-relative paths (base URL already includes /api)', () => {
		expect(CMS_ACCOUNT_LINK.status).toBe('/account-link/shop/status');
		expect(CMS_ACCOUNT_LINK.start).toBe('/account-link/shop/start');
		expect(CMS_ACCOUNT_LINK.confirm).toBe('/account-link/shop/confirm');
		expect(CMS_ACCOUNT_LINK.unlink).toBe('/account-link/shop/unlink');
		expect(CMS_ACCOUNT_LINK.orders).toBe('/account-link/shop/orders');
		for (const path of Object.values(CMS_ACCOUNT_LINK)) {
			expect(path.startsWith('/api/')).toBe(false);
		}
	});
});

describe('parseShopLinkStatus', () => {
	it('reads a linked shop account', () => {
		expect(
			parseShopLinkStatus({
				linked: true,
				medusa_customer_id: 'cus_1',
				medusa_customer_email: 'shop@example.com',
				linked_at: '2026-01-01T00:00:00.000Z'
			})
		).toEqual({
			linked: true,
			medusa_customer_id: 'cus_1',
			medusa_customer_email: 'shop@example.com',
			linked_at: '2026-01-01T00:00:00.000Z',
			error: null
		});
	});
});

describe('parseShopOrders', () => {
	it('maps a customer-facing order without exposing raw ids', () => {
		expect(
			parseShopOrders({
				orders: [
					{
						id: 'order_secret',
						display_id: 1042,
						created_at: '2026-03-01T12:00:00.000Z',
						status: 'completed',
						total: 49.99,
						currency_code: 'usd',
						items: [{}, {}]
					}
				]
			})
		).toEqual([
			{
				number: 'Order 1042',
				placedAt: '2026-03-01T12:00:00.000Z',
				status: 'completed',
				totalLabel: '$49.99',
				itemCount: 2
			}
		]);
	});
});
