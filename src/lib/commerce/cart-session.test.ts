import { describe, expect, it } from 'vitest';

import { parseCartSummary } from './cart-session';

describe('parseCartSummary', () => {
	it('reads itemCount and redirectUrl', () => {
		expect(
			parseCartSummary({
				ok: true,
				itemCount: 3.8,
				redirectUrl: 'https://shop.example/cart?cart_id=c1'
			})
		).toEqual({
			itemCount: 3,
			cartUrl: 'https://shop.example/cart?cart_id=c1'
		});
	});

	it('allows a missing shop URL', () => {
		expect(parseCartSummary({ itemCount: 1, redirectUrl: null })).toEqual({
			itemCount: 1,
			cartUrl: null
		});
	});

	it('rejects payloads without a finite count', () => {
		expect(parseCartSummary({ redirectUrl: 'https://shop.example/cart' })).toBeNull();
		expect(parseCartSummary({ itemCount: Number.NaN })).toBeNull();
	});
});
