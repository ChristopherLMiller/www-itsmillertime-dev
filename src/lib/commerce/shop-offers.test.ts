import { describe, expect, it } from 'vitest';

import { displaySizeLabel, groupShopOffers } from './shop-offers';

describe('groupShopOffers', () => {
	it('groups by paper type with sizes sorted inside each group', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-11',
				title: 'Photo Rag · 11x14',
				paper: 'Photo Rag',
				paperDescription: 'Cotton rag with a soft matte surface.',
				format: '11x14',
				priceUSD: 45,
				digital: false
			},
			{
				variantId: 'v-8',
				title: 'Photo Rag · 8x10',
				paper: 'Photo Rag',
				format: '8x10',
				priceUSD: 25,
				digital: false
			},
			{
				variantId: 'v-dig',
				title: 'Digital Download',
				paper: null,
				format: 'Digital download',
				priceUSD: 15,
				digital: true
			},
			{
				variantId: 'v-lustre',
				title: 'Lustre · 8x10',
				paper: 'Lustre',
				format: '8x10',
				priceUSD: 20,
				digital: false
			}
		]);

		expect(groups.map((g) => g.name)).toEqual(['Digital', 'Lustre', 'Photo Rag']);
		expect(groups[0]?.description).toBeNull();
		expect(groups[1]?.description).toBeNull();
		expect(groups[2]?.description).toBe('Cotton rag with a soft matte surface.');
		expect(groups[0]?.offers.map((o) => o.title)).toEqual(['Download']);
		expect(groups[1]?.offers.map((o) => o.title)).toEqual(['8×10']);
		expect(groups[2]?.offers.map((o) => o.title)).toEqual(['8×10', '11×14']);
	});

	it('falls back to a Prints group when paper is missing', () => {
		const groups = groupShopOffers([
			{ variantId: 'v1', title: '11x14', format: '11x14', digital: false, priceUSD: 30 }
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.name).toBe('Prints');
		expect(groups[0]?.offers[0]?.title).toBe('11×14');
	});
});

describe('displaySizeLabel', () => {
	it('normalizes x to a multiplication sign', () => {
		expect(displaySizeLabel('8x10')).toBe('8×10');
		expect(displaySizeLabel('11X14')).toBe('11×14');
	});
});
