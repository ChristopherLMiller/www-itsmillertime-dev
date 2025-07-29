import { PageSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export const getPage = async (fetch, slug: string) => {
	const queryParams = {
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: slug
					}
				}
			]
		}
	};

	const response = await await fetch(`/api/payload?endpoint=pages&${qs.stringify(queryParams)}`);

	if (response.ok) {
		const data = await response.json();

		const parsedPage = PayloadResponseSchema(PageSchema).parse(data);

		if (parsedPage.totalDocs > 1) {
			throw error(500, 'Multiple pages found');
		}

		if (parsedPage.docs.length === 1) {
			return parsedPage.docs[0];
		}
	}

	// If the page is not found, throw a 404 error
	throw error(404, 'Page not found');
};
