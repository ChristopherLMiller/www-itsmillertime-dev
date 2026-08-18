import { describe, expect, it } from 'vitest';

import { parseCartAddBody } from './cart-items';

describe('parseCartAddBody', () => {
	it('parses a batch of line items and drops qty 0', () => {
		expect(
			parseCartAddBody({
				items: [
					{ variantId: 'a', quantity: 2 },
					{ variantId: 'b', quantity: 0 },
					{ variantId: 'c', quantity: 1.8 }
				]
			})
		).toEqual([
			{ variantId: 'a', quantity: 2 },
			{ variantId: 'c', quantity: 1 }
		]);
	});

	it('keeps the legacy single-variant body, defaulting qty to 1', () => {
		expect(parseCartAddBody({ variantId: 'v1' })).toEqual([{ variantId: 'v1', quantity: 1 }]);
		expect(parseCartAddBody({ variantId: 'v1', quantity: 4 })).toEqual([
			{ variantId: 'v1', quantity: 4 }
		]);
	});

	it('returns null for empty or invalid payloads', () => {
		expect(parseCartAddBody(null)).toBeNull();
		expect(parseCartAddBody({})).toBeNull();
		expect(parseCartAddBody({ items: [{ variantId: 'a', quantity: 0 }] })).toBeNull();
	});
});
