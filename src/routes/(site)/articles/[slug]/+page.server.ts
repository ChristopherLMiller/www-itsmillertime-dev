import { error } from '@sveltejs/kit';
import { FetchFromStrapi } from '../../../../utilities/fetch.js';

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

	const response = await FetchFromStrapi({ path: 'posts', queryParams });

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
