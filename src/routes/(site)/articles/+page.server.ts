import * as qs from 'qs-esm';
/*import { cacheManager } from '$lib/cache/cache.js';


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

	const cacheKey = [page, pageSize, category].filter(Boolean).join(':');
	const response = await cacheManager.fetch('posts', queryParams, `posts:${cacheKey}`);

	return {
		posts: response
	};
}*/

export async function load({ url }) {
	const { page = 1, limit = 10, category } = Object.fromEntries(url.searchParams);
	const queryParams = {
		sort: '-publishedAt',
		where: {
			and: [
				{
					'category.slug': {
						equals: category
					}
				},
				{
					_status: {
						equals: 'published'
					}
				},
				{
					publishedAt: {
						not_equal: null
					}
				}
			]
		},
		depth: 1,
		limit: limit,
		page: page
	};

	console.log(`https://cms.itsmillertime.dev/api/posts?${qs.stringify(queryParams)}`);

	const response = await fetch(
		`https://cms.itsmillertime.dev/api/posts?${qs.stringify(queryParams)}`
	);
	const data = await response.json();
	return {
		posts: data.docs,
		meta: {
			hasNextPage: data.hasNextPage,
			hasPrevPage: data.hasPrevPage,
			limit: data.limit,
			nextPage: data.nextPage,
			pagingCounter: data.pagingCounter,
			prevPage: data.prevPage,
			totalDocs: data.totalDocs,
			totalPages: data.totalPages
		}
	};
}
