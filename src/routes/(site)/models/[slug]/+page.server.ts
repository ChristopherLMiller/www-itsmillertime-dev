import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { fetch, request, params, url } = event;
	const modelData = await getPayloadSDK(fetch, request).find({
		collection: 'models',
		depth: 2,
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
			meta: true,
			relatedResources: true
		}
	});

	const doc = modelData.docs[0];
	if (!doc) {
		throw error(404, 'Model not found');
	}

	const user = await getMergedSessionUser(event);
	const isAdmin = isAdminRole(user);
	if (!isAdmin && doc.model_meta?.status === 'NOT_STARTED') {
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
