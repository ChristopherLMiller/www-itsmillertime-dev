import { getPayloadSDK } from '$lib/payload.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, params, url }) => {
	const modelData = await getPayloadSDK(fetch, request).find({
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
	if (!doc) {
		throw error(404, 'Model not found');
	}

	const meta = doc.meta
		? { ...doc.meta, canonicalURL: `${url.origin}/models/${params.slug}` }
		: { canonicalURL: `${url.origin}/models/${params.slug}` };
	return {
		model: doc,
		meta
	};
};
