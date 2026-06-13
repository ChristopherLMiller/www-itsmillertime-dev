import { getPayloadSDK } from '$lib/payload/sdk.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const pageData = await getPayloadSDK(fetch, request).find({
		collection: 'pages',
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					}
				},
				{
					slug: {
						equals: 'home'
					}
				}
			]
		}
	});

	if (pageData.totalDocs === 0) {
		throw error(404, 'Page not found');
	}

	const doc = pageData.docs[0];
	const meta = doc.meta
		? { ...doc.meta, canonicalURL: `${url.origin}/` }
		: { canonicalURL: `${url.origin}/` };
	return {
		page: doc,
		meta
	};
};
