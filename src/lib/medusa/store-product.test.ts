import { describe, expect, it } from 'vitest';

import {
	applyOfferingSetDescriptions,
	isDigitalStoreVariant,
	parseStoreProduct,
	readOfferingSets
} from './store-product';

describe('parseStoreProduct', () => {
	it('returns null for empty or id-less payloads', () => {
		expect(parseStoreProduct(null)).toBeNull();
		expect(parseStoreProduct({})).toBeNull();
		expect(parseStoreProduct({ product: { title: 'x' } })).toBeNull();
	});

	it('returns null when variants have no ids (restricted fields shape)', () => {
		expect(
			parseStoreProduct({
				product: {
					id: 'prod_1',
					variants: [{ calculated_price: { calculated_amount: 12 } }]
				}
			})
		).toBeNull();
	});

	it('prefers the digital variant over variants[0] print SKU', () => {
		const parsed = parseStoreProduct({
			product: {
				id: 'prod_1',
				variants: [
					{
						id: 'variant_print',
						title: '11×14',
						options: [
							{ value: 'Photo Rag', option: { title: 'Paper' } },
							{ value: '11x14', option: { title: 'Format' } }
						],
						calculated_price: { calculated_amount: 45 }
					},
					{
						id: 'variant_digital',
						title: 'Digital Download',
						metadata: { fulfillment_type: 'digital' },
						calculated_price: { calculated_amount: 15 }
					}
				]
			}
		});
		expect(parsed?.variantId).toBe('variant_digital');
		expect(parsed?.priceUSD).toBe(15);
		expect(parsed?.variants).toHaveLength(2);
		expect(parsed?.variants.map((v) => v.digital)).toEqual([false, true]);
		expect(parsed?.variants[0]).toMatchObject({ paper: 'Photo Rag', format: '11x14' });
		expect(parsed?.variants[1]?.paper).toBeNull();
	});

	it('treats manage_inventory: false as a legacy digital variant', () => {
		const parsed = parseStoreProduct({
			id: 'prod_legacy',
			variants: [{ id: 'v1', manage_inventory: false, calculated_price: { calculated_amount: 9 } }]
		});
		expect(parsed?.variants[0]?.digital).toBe(true);
		expect(parsed?.variantId).toBe('v1');
	});

	it('reads amount from prices[] when calculated_price is missing', () => {
		const parsed = parseStoreProduct({
			product: {
				id: 'prod_2',
				variants: [{ id: 'v1', title: 'Digital Download', prices: [{ amount: 19.99 }] }]
			}
		});
		expect(parsed?.priceUSD).toBe(19.99);
	});
});

describe('readOfferingSets / applyOfferingSetDescriptions', () => {
	it('reads offering sets from a dedicated store payload', () => {
		expect(
			readOfferingSets({
				offering_sets: [
					{ id: 'os_1', name: 'Photo Rag', description: '  Cotton rag.  ' },
					{ id: 'os_2', name: 'Lustre', description: '' }
				]
			})
		).toEqual([
			{ name: 'Photo Rag', description: 'Cotton rag.' },
			{ name: 'Lustre', description: null }
		]);
	});

	it('matches set descriptions onto print variants by paper name', () => {
		const parsed = parseStoreProduct({
			product: {
				id: 'prod_1',
				variants: [
					{
						id: 'variant_print',
						options: [
							{ value: 'Photo Rag', option: { title: 'Paper' } },
							{ value: '11x14', option: { title: 'Format' } }
						],
						calculated_price: { calculated_amount: 45 }
					},
					{
						id: 'variant_digital',
						metadata: { fulfillment_type: 'digital' },
						calculated_price: { calculated_amount: 15 }
					}
				]
			}
		});
		const withCopy = applyOfferingSetDescriptions(parsed!, [
			{ name: 'Photo Rag', description: 'Cotton rag with a soft matte surface.' }
		]);
		expect(withCopy.variants[0]?.paperDescription).toBe(
			'Cotton rag with a soft matte surface.'
		);
		expect(withCopy.variants[1]?.paperDescription).toBeNull();
	});
});

describe('isDigitalStoreVariant', () => {
	it('detects Digital Download option values', () => {
		expect(
			isDigitalStoreVariant({
				id: 'v',
				options: [{ value: 'Digital' }, { value: 'Digital Download' }]
			})
		).toBe(true);
	});

	it('does not treat made-to-order prints as digital', () => {
		expect(
			isDigitalStoreVariant({
				id: 'v',
				title: '11x14',
				manage_inventory: false,
				options: [
					{ value: 'Photo Rag', option: { title: 'Paper' } },
					{ value: '11x14', option: { title: 'Format' } }
				]
			})
		).toBe(false);
	});
});
