import { PostSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import * as qs from 'qs-esm';

export const getArticles = async (fetch, params) => {
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
		limit: 10,
		page: 1
	};
	const mergedParams = { ...queryParams, ...params };

	const response = await fetch(`/api/payload?endpoint=posts&${qs.stringify(mergedParams)}`);

	if (response.ok) {
		const data = await response.json();
		const parsedArticles = PayloadResponseSchema(PostSchema).parse(data);
		const { docs: articles, ...meta } = parsedArticles;

		return {
			articles,
			meta
		};
	}

	return null;
};
