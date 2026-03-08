import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params, url }) => {
	const post = await getPayloadSDK(fetch).find({
		collection: 'posts',
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: (params as { slug: string }).slug
					}
				}
			]
		}
	});

	if (post.totalDocs === 0) {
		throw error(404, 'Article not found');
	}

	const doc = post.docs[0];
	const slug = (params as { slug: string }).slug;
	const meta = doc.meta ? { ...doc.meta, canonicalURL: `${url.origin}/articles/${slug}` } : { canonicalURL: `${url.origin}/articles/${slug}` };
	return {
		article: doc,
		meta
	};
};
