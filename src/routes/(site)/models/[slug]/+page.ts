import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, fetch, params, url }) => {
	const modelData = await getPayloadSDK(fetch).find({
		collection: 'models',
		where: {
			slug: {
				equals: params.slug
			}
		},
		select: {
			id: true,
			title: true,
			createdAt: true,
			updatedAt: true,
			slug: true,
			model_meta: true,
			clockify_project: true,
			buildLog: true,
			image: true,
			meta: true
		}
	});

	const doc = modelData.docs[0];
	const meta = doc.meta ? { ...doc.meta, canonicalURL: `${url.origin}/models/${params.slug}` } : { canonicalURL: `${url.origin}/models/${params.slug}` };
	return {
		model: doc,
		meta
	};
};
