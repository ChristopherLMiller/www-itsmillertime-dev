import { payloadClient } from '$lib/api/payload-client.js';
import { PostSchema } from '$lib/schemas/zod/generated.js';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response.js';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

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
	const articleData = await payloadClient.fetchWithValidation(
		`/posts?${qs.stringify(queryParams)}`,
		PayloadResponseSchema(PostSchema)
	);

	if (articleData.totalDocs > 1) {
		throw error(500, 'Multiple posts found');
	}

	if (articleData.totalDocs === 1) {
		return {
			post: articleData.docs[0],
			meta: {
				metaTitle: articleData.docs[0].meta.title,
				metaDescription: articleData.docs[0].meta.description,
				metaImage: {
					url: articleData.docs[0]?.meta?.image?.url
				}
			}
		};
	}

	return error(404, 'Post not found');
}
