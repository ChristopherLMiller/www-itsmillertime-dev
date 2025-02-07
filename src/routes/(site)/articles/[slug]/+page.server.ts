import { cacheManager } from '$lib/cache/cache.js';
import { error } from '@sveltejs/kit';
import type { Post } from '../../../../types/Post';

// src/routes/+page.js
export async function load({ params }) {
	const queryParams = {
		populate: {
			seo: {
				populate: {
					metaImage: true
				}
			},
			postCategory: true
		},
		where: {
			slug: {
				$eq: params.slug
			}
		}
	};

	const response = await cacheManager.fetch<Post[]>('posts', queryParams, params.slug);

	if (response.data.length > 0) {
		const post = response.data[0];
		return {
			post: post,
			meta: post.seo
		};
	} else {
		throw error(404, 'Post not found');
	}
}
