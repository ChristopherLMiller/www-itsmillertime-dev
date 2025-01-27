import { cacheManager } from '$lib/cache/cache.js';

// src/routes/+page.js
export async function load({ url }) {
	const { page = 1, pageSize = 100, category } = Object.fromEntries(url.searchParams);
	const queryParams = {
		populate: {
			seo: {
				populate: {
					metaImage: true
				}
			},
			postCategory: true
		},
		pagination: {
			page,
			pageSize
		},
		filters: {
			publicationDate: {
				$notNull: true
			},
			postCategory: {
				slug: {
					$eq: category
				}
			}
		},
		sort: ['publicationDate:desc']
	};

	const response = await cacheManager.fetch(
		'posts',
		queryParams,
		`posts:${page}:${pageSize}:${category}`
	);

	return {
		posts: response
	};
}
