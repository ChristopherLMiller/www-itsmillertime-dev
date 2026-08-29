import { describe, expect, it } from 'vitest';

import {
	DIGITAL_DOWNLOAD_DESCRIPTION,
	defaultFinishForOffers,
	displaySizeLabel,
	finishOptionsForOffers,
	groupShopOffers,
	listingsForGroup,
	offerForFinish,
	printSizeAspectFit,
	shopGlossary,
	paperChipsForVariant,
	uniqueSizeCount
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
		expect(groups[1]?.offers[0]?.paperChips).toEqual([]);
		expect(groups[2]?.offers.map((o) => o.paperChips)).toEqual([[], []]);
		expect(groups[2]?.offers.every((o) => o.purchasable)).toBe(true);
	});

	it('keeps the same paper together and lists finishes on the offers', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-gloss',
				title: 'Photo Rag · 4x6 · Gloss',
				paper: 'Photo Rag',
				format: '4x6',
				finish: 'Gloss',
				digital: false,
				priceUSD: 12
			},
			{
				variantId: 'v-matte',
				title: 'Photo Rag · 4x6 · Matte',
				paper: 'Photo Rag',
				format: '4x6',
				finish: 'Matte',
				digital: false,
				priceUSD: null
			},
			{
				variantId: 'v-metallic',
				title: 'Photo Rag · 4x6 · Metallic',
				paper: 'Photo Rag',
				format: '4x6',
				finish: 'Metallic',
				digital: false,
				priceUSD: 16
			},
			{
				variantId: 'v-standard',
				title: 'Photo Rag · 8x10',
				paper: 'Photo Rag',
				format: '8x10',
				finish: 'Standard',
				digital: false,
				priceUSD: 18
			}
		]);
		expect(groups.map((g) => g.name)).toEqual(['Photo Rag']);
		const listings = listingsForGroup(groups[0]!);
		expect(listings.map((listing) => listing.title)).toEqual(['4×6″', '8×10″']);
		expect(finishOptionsForOffers(listings[0]!.offers)).toEqual([
			{ value: 'Gloss', label: 'Gloss' },
			{ value: 'Matte', label: 'Matte' },
			{ value: 'Metallic', label: 'Metallic' }
		]);
		expect(defaultFinishForOffers(listings[0]!.offers)).toBe('Gloss');
		expect(offerForFinish(listings[0]!.offers, 'Matte')).toMatchObject({
			variantId: 'v-matte',
			purchasable: false
		});
		expect(finishOptionsForOffers(listings[1]!.offers)).toEqual([]);
		expect(uniqueSizeCount(groups[0]!.offers)).toBe(2);
	});

	it('shows a finish picker on a size even when it has only one finish', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-gloss',
				title: 'C-Type · 4x6 · Gloss',
				paper: 'Continuous-tone silver halide photo print',
				format: '4x6',
				finish: 'Gloss',
				digital: false,
				priceUSD: 22
			}
		]);
		expect(finishOptionsForOffers(groups[0]!.offers)).toEqual([{ value: 'Gloss', label: 'Gloss' }]);
		expect(groups[0]?.offers[0]?.finish).toBe('Gloss');
		expect(groups[0]?.offers[0]?.paperChips).toEqual(['C-Type']);
	});

	it('gives each size its own finish options including a single metallic listing', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-gloss',
				title: 'C-Type · 4x6 · Gloss',
				paper: 'Continuous-tone silver halide photo print',
				format: '4x6',
				finish: 'Gloss',
				digital: false,
				priceUSD: null
			},
			{
				variantId: 'v-lustre',
				title: 'C-Type · 4x6 · Lustre',
				paper: 'Continuous-tone silver halide photo print',
				format: '4x6',
				finish: 'Lustre',
				digital: false,
				priceUSD: null
			},
			{
				variantId: 'v-metallic',
				title: 'C-Type · 5x7 · Metallic',
				paper: 'Continuous-tone silver halide photo print',
				format: '5x7',
				finish: 'Metallic',
				digital: false,
				priceUSD: null
			}
		]);
		const listings = listingsForGroup(groups[0]!);
		expect(listings.map((listing) => listing.title)).toEqual(['4×6″', '5×7″']);
		expect(finishOptionsForOffers(listings[0]!.offers)).toEqual([
			{ value: 'Gloss', label: 'Gloss' },
			{ value: 'Lustre', label: 'Lustre' }
		]);
		expect(finishOptionsForOffers(listings[1]!.offers)).toEqual([
			{ value: 'Metallic', label: 'Metallic' }
		]);
	});

	it('keeps digital buyable when the store price is still missing', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-dig',
				title: 'Digital Download',
				digital: true,
				priceUSD: null
			}
		]);
		expect(groups[0]?.offers[0]).toMatchObject({
			title: 'Download',
			purchasable: true,
			priceUSD: null
		});
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
		expect(groups[0]?.offers[0]?.paperChips).toEqual(['LPP']);
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
		expect(groups[0]?.offers[0]?.paperChips).toEqual(['HPR']);
	});

	it('puts specified paper types on chips and omits a chip when none is on the SKU', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-plain',
				title: 'C-Type · 4x6',
				paper: 'C-Type',
				format: '4x6',
				digital: false,
				priceUSD: 12
			},
			{
				variantId: 'v-archival',
				title: 'C-Type · 4x6 · Archival Professional',
				paper: 'C-Type',
				format: '4×6″ · 240gsm',
				digital: false,
				priceUSD: 18
			},
			{
				variantId: 'v-bare',
				title: '8x10',
				paper: 'C-Type',
				format: '8x10',
				digital: false,
				priceUSD: 20
			}
		]);
		expect(groups).toHaveLength(1);
		expect(
			groups[0]?.offers.map((offer) => ({ title: offer.title, paperChips: offer.paperChips }))
		).toEqual([
			{ title: '4×6″', paperChips: [] },
			{ title: '4×6″ · 240gsm', paperChips: ['Archival Professional'] },
			{ title: '8×10″', paperChips: [] }
		]);
		expect(listingsForGroup(groups[0]!).map((listing) => listing.paperChips)).toEqual([
			[],
			['Archival Professional'],
			[]
		]);
	});

	it('puts every paper type from a size-first title on chips', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-archival',
				title: '4×6″ · C-Type · silver halide · Archival Professional',
				paper: 'Continuous-tone silver halide photo print',
				format: '4x6',
				digital: false,
				priceUSD: 18
			}
		]);
		expect(groups[0]?.offers[0]?.paperChips).toEqual([
			'C-Type',
			'silver halide',
			'Archival Professional'
		]);
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

describe('shopGlossary', () => {
	it('returns nothing for digital-only listings', () => {
		expect(
			shopGlossary(
				groupShopOffers([
					{ variantId: 'v-dig', title: 'Digital Download', digital: true, priceUSD: 15 }
				])
			)
		).toEqual([]);
	});

	it('explains finish, paper weight, and chips without lab codes', () => {
		const groups = groupShopOffers([
			{
				variantId: 'v-lpp',
				title: '4×6″ · LPP · 240gsm',
				paper: 'Lustre',
				format: '4x6',
				finish: 'Gloss',
				digital: false,
				priceUSD: 12
			},
			{
				variantId: 'v-hpr',
				title: 'Photo Rag · 8x10',
				paper: 'Photo Rag',
				format: '8×10″ · HPR · 308gsm',
				digital: false,
				priceUSD: 25
			}
		]);
		const glossary = shopGlossary(groups);
		expect(glossary.map((entry) => entry.term)).toEqual(['Finish', 'gsm', 'Chips']);
		expect(glossary.find((entry) => entry.term === 'Finish')?.items?.map((item) => item.term)).toEqual(
			['Gloss']
		);
		expect(glossary.find((entry) => entry.term === 'gsm')?.meaning).toMatch(/grams per square metre/i);
		expect(
			glossary.find((entry) => entry.term === 'Chips')?.items?.map((item) => ({
				term: item.term,
				chipKind: item.chipKind
			}))
		).toEqual([
			{ term: 'LPP', chipKind: 'paper' },
			{ term: 'Crop', chipKind: 'crop' },
			{ term: 'Low res', chipKind: 'low' }
		]);
	});

	it('explains chips even when a print listing has no finish picker or gsm', () => {
		const glossary = shopGlossary(
			groupShopOffers([
				{
					variantId: 'v-plain',
					title: '8x10',
					paper: 'C-Type',
					format: '8x10',
					digital: false,
					priceUSD: 20
				}
			])
		);
		expect(glossary.map((entry) => entry.term)).toEqual(['Chips']);
		expect(
			glossary[0]?.items?.map((item) => ({ term: item.term, chipKind: item.chipKind }))
		).toEqual([
			{ term: 'Crop', chipKind: 'crop' },
			{ term: 'Low res', chipKind: 'low' }
		]);
	});
});

describe('paperChipsForVariant', () => {
	it('uses every specified paper type as a chip and skips finish, size, and weight', () => {
		expect(
			paperChipsForVariant({
				variantId: 'v-lpp',
				title: '4×6″ · LPP · 240gsm',
				paper: 'Lustre',
				format: '4x6',
				digital: false
			})
		).toEqual(['LPP']);
		expect(
			paperChipsForVariant({
				variantId: 'v-ctype',
				title: 'C-Type · 4x6 · Archival Professional · Gloss',
				paper: 'C-Type',
				finish: 'Gloss',
				format: '4x6',
				digital: false
			})
		).toEqual(['Archival Professional']);
		expect(
			paperChipsForVariant({
				variantId: 'v-hpr',
				title: 'Photo Rag · 4x6',
				paper: 'Photo Rag',
				format: '4×6″ · HPR · 308gsm',
				digital: false
			})
		).toEqual(['HPR']);
		expect(
			paperChipsForVariant({
				variantId: 'v-bare',
				title: '8x10',
				paper: 'Photo Rag',
				format: '8x10',
				digital: false
			})
		).toEqual([]);
	});
});
