import * as qs from 'qs-esm';
// src/routes/+page.js
/*export async function load({ params }) {
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
}*/

export async function load({ params }) {
	const queryParams = {
		where: {
			and: [
				{
					slug: {
						equals: params.slug
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
		}
	};
	const response = await fetch(
		`https://cms.itsmillertime.dev/api/posts?${qs.stringify(queryParams)}`
	);
	const data = await response.json();
	return {
		post: data.docs[0],
		meta: {
			metaTitle: data.docs[0].meta.title,
			metaDescription: data.docs[0].meta.description,
			metaImage: {
				url: data.docs[0]?.meta?.image?.url
			},
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
