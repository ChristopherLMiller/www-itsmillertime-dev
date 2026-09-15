import type { GardenCacheData, GardenPageMeta, GardensListCacheData } from '$lib/cache/gardenCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';

export type GardenLoadOptions = {
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

const gardenSelect = {
	name: true,
	slug: true,
	featuredImage: true,
	content: true,
	meta: true
} as const;

export async function loadGardensListPageData(
	options: GardenLoadOptions = {}
): Promise<GardensListCacheData> {
	const { fetch, request } = options;
	const result = await getPayloadSDK(fetch, request).find({
		collection: 'gardens',
		limit: 100,
		sort: '-updatedAt',
		depth: 1,
		select: gardenSelect
	});

	return { gardens: result.docs as GardensListCacheData['gardens'] };
}

export async function loadGardenPageData(
	segment: string,
	origin: string,
	options: GardenLoadOptions = {}
): Promise<GardenCacheData | null> {
	const { fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	const isNumeric = /^\d+$/.test(segment);

	let result = await sdk.find({
		collection: 'gardens',
		where: {
			slug: {
				equals: segment
			}
		},
		limit: 1,
		depth: 1,
		select: gardenSelect
	});

	if (result.totalDocs === 0 && isNumeric) {
		result = await sdk.find({
			collection: 'gardens',
			where: {
				id: {
					equals: Number(segment)
				}
			},
			limit: 1,
			depth: 1,
			select: gardenSelect
		});
	}

	if (result.totalDocs === 0) return null;

	const garden = result.docs[0];
	const slug = garden.slug ?? String(garden.id);
	const meta: GardenPageMeta = garden.meta
		? { ...garden.meta, canonicalURL: `${origin}/garden/${slug}` }
		: { canonicalURL: `${origin}/garden/${slug}` };

	return { slug: segment, garden: garden as GardenCacheData['garden'], meta };
}
