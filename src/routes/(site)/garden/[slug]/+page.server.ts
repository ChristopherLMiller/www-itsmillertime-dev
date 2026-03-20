import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, params, url }) => {
	const sdk = getPayloadSDK(fetch, request);
	const segment = params.slug;
	const isNumeric = /^\d+$/.test(segment);

	let result = await sdk.find({
		collection: 'gardens',
		where: {
			slug: {
				equals: segment
			}
		},
		limit: 1,
		depth: 2
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
			depth: 2
		});
	}

	if (result.totalDocs === 0) {
		error(404, 'Not found');
	}

	const garden = result.docs[0];
	const slug = garden.slug ?? String(garden.id);
	const meta = garden.meta
		? { ...garden.meta, canonicalURL: `${url.origin}/garden/${slug}` }
		: { canonicalURL: `${url.origin}/garden/${slug}` };

	return { garden, meta };
};
