import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const pageData = await getPayloadSDK(fetch).find({
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
						equals: params.slug
					}
				}
			]
		}
	});

	if (pageData.totalDocs === 0) {
		throw error(404, 'Page not found');
	}

	const doc = pageData.docs[0];
	const meta = doc.meta ? { ...doc.meta, canonicalURL: `${url.origin}/${params.slug}` } : { canonicalURL: `${url.origin}/${params.slug}` };
	return {
		page: doc,
		meta
	};
};
