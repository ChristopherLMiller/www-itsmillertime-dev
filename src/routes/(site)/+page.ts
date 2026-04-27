import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';

export async function load({ fetch, url }) {
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
}
