import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageLoad } from '../$types';

export const load: PageLoad = async ({ fetch, params }) => {
	const post = await getPayloadSDK(fetch).find({
		collection: 'posts',
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: params.slug
					}
				}
			]
		}
	});

	if (post.totalDocs === 0) {
		throw error(404, 'Article not found');
	}

	return {
		article: post.docs[0],
		meta: post.docs[0].meta
	};
};
