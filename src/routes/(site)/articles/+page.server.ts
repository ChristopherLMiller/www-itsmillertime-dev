import { payloadClient } from '$lib/api/payload-client.js';
import { PostSchema } from '$lib/schemas/zod/generated.js';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response.js';
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
	const { page = 1, limit = 15, category } = Object.fromEntries(url.searchParams);
	const queryParams = {
		sort: '-publishedAt',
		select: {
			publishedAt: true,
			slug: true,
			word_count: true,
			content: true,
			title: true,
			featuredImage: true,
			createdAt: true,
			updatedAt: true,
			originalPublicationDate: true,
			category: true
		},
		populate: {
			category: true
		},
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
		limit: limit,
		page: page
	};

	const articlesData = await payloadClient.fetchWithValidation(
		`/posts?${qs.stringify(queryParams)}`,
		PayloadResponseSchema(PostSchema)
	);
	return {
		posts: articlesData.docs,
		meta: {
			hasNextPage: articlesData.hasNextPage,
			hasPrevPage: articlesData.hasPrevPage,
			limit: articlesData.limit,
			nextPage: articlesData.nextPage,
			pagingCounter: articlesData.pagingCounter,
			prevPage: articlesData.prevPage,
			totalDocs: articlesData.totalDocs,
			totalPages: articlesData.totalPages
		}
	};
}
