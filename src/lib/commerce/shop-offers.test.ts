import { describe, expect, it } from 'vitest';

import {
	DIGITAL_DOWNLOAD_DESCRIPTION,
	displaySizeLabel,
	groupShopOffers,
	printSizeAspectFit
} from './shop-offers';

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
		expect(groups[0]?.description).toBe(DIGITAL_DOWNLOAD_DESCRIPTION);
		expect(groups[1]?.description).toBeNull();
		expect(groups[2]?.description).toBe('Cotton rag with a soft matte surface.');
		expect(groups[0]?.offers.map((o) => o.title)).toEqual(['Download']);
		expect(groups[1]?.offers.map((o) => o.title)).toEqual(['8×10″']);
		expect(groups[2]?.offers.map((o) => o.title)).toEqual(['8×10″', '11×14″']);
	});

	it('uses Medusa copy for digital when an offering-set description is present', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-dig',
				title: 'Digital Download',
				digital: true,
				priceUSD: 15,
				paperDescription: 'Full-resolution files, emailed after purchase.'
			}
		]);
		expect(groups[0]?.kind).toBe('digital');
		expect(groups[0]?.description).toBe('Full-resolution files, emailed after purchase.');
	});

	it('falls back to a Prints group when paper is missing', () => {
		const groups = groupShopOffers([
			{ variantId: 'v1', title: '11x14', format: '11x14', digital: false, priceUSD: 30 }
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.name).toBe('Prints');
		expect(groups[0]?.offers[0]?.title).toBe('11×14″');
	});

	it('uses the saved variant title when it is the size label', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-lpp',
				title: '4×6″ · LPP · 240gsm',
				paper: 'Lustre',
				format: '4x6',
				digital: false,
				priceUSD: 12
			}
		]);
		expect(groups[0]?.offers[0]?.title).toBe('4×6″ · 240gsm');
	});

	it('uses the Format option when that is the saved size label', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-hpr',
				title: 'Photo Rag · 4x6',
				paper: 'Photo Rag',
				format: '4×6″ · HPR · 308gsm',
				digital: false,
				priceUSD: 18
			}
		]);
		expect(groups[0]?.offers[0]?.title).toBe('4×6″ · 308gsm');
	});
});

describe('displaySizeLabel', () => {
	it('normalizes x to a multiplication sign and adds an inch mark', () => {
		expect(displaySizeLabel('8x10')).toBe('8×10″');
		expect(displaySizeLabel('11X14')).toBe('11×14″');
	});

	it('keeps size, unit, and weight without paper type codes', () => {
		expect(displaySizeLabel('4×6″ · HPR · 308gsm')).toBe('4×6″ · 308gsm');
		expect(displaySizeLabel('5×7" · LPP · 240gsm')).toBe('5×7″ · 240gsm');
		expect(displaySizeLabel('30.5×38.1 cm · LPP · 240gsm')).toBe('30.5×38.1 cm · 240gsm');
	});
});

describe('printSizeAspectFit', () => {
	const landscape3x2 = { w: 5184, h: 3456 };

	it('treats 3:2 print sizes as a match on a 3:2 photo', () => {
		expect(printSizeAspectFit('4×6″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe('match');
		expect(printSizeAspectFit('6×4', landscape3x2.w, landscape3x2.h)).toBe('match');
		expect(printSizeAspectFit('8×12″ · HPR · 308gsm', landscape3x2.w, landscape3x2.h)).toBe(
			'match'
		);
	});

	it('suggests nearby sizes as a crop', () => {
		expect(printSizeAspectFit('5×7″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe('crop');
		expect(printSizeAspectFit('8×10″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe('crop');
		expect(printSizeAspectFit('6×8″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe('crop');
		expect(printSizeAspectFit('11×14″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe(
			'crop'
		);
		expect(printSizeAspectFit('10×12″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe(
			'crop'
		);
	});

	it('marks squares and panoramas as far from 3:2', () => {
		expect(printSizeAspectFit('8×8″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe('far');
		expect(printSizeAspectFit('10×20″ · LPP · 240gsm', landscape3x2.w, landscape3x2.h)).toBe('far');
	});

	it('does not mark digital or unparseable labels', () => {
		expect(printSizeAspectFit('Download', landscape3x2.w, landscape3x2.h)).toBe('match');
		expect(printSizeAspectFit('8×10', null, null)).toBe('match');
	});
});
