import { payloadClient } from '$lib/api/payload-client';
import { PageSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export async function load() {
	const queryParams = {
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: 'home'
					}
				}
			]
		}
	};

	const pageData = await payloadClient.fetchWithValidation(
		`/pages?${qs.stringify(queryParams)}`,
		PayloadResponseSchema(PageSchema)
	);

	if (pageData.totalDocs > 1) {
		throw error(500, 'Multiple pages found');
	}

	if (pageData.docs.length === 1) {
		return {
			page: pageData.docs[0],
			meta: pageData.docs[0].meta
		};
	}

	// Default throw a not found error
	throw error(404, 'Page not found');
}
