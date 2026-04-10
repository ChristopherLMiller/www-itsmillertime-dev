import { getPayloadSDK } from '$lib/payload.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url, params, request }) => {
	const sdk = getPayloadSDK(fetch, request);
	const slug = params.slug;

	const post = await sdk.find({
		collection: 'posts',
		limit: 1,
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: slug
					}
				}
			]
		}
	});

	if (post.totalDocs === 0) {
		throw error(404, 'Article not found');
	}

	const doc = post.docs[0];
	const meta = doc.meta
		? { ...doc.meta, canonicalURL: `${url.origin}/articles/${slug}` }
		: { canonicalURL: `${url.origin}/articles/${slug}` };

	return {
		article: doc,
		meta
	};
};
