import { PostSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export const getArticle = async (fetch, slug) => {
	const queryParams = {
		where: {
			and: [
				{
					slug: {
						equals: slug
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

	const response = await fetch(`/api/payload?endpoint=posts&${qs.stringify(queryParams)}`);

	if (response.ok) {
		const data = await response.json();
		const parsedArticle = PayloadResponseSchema(PostSchema).parse(data);

		if (parsedArticle.totalDocs > 1) {
			throw error(500, 'Multiple posts found');
		}

		if (parsedArticle.totalDocs === 1) {
			return parsedArticle.docs[0];
		}

		throw error(404, 'Article not found');
	}
};
