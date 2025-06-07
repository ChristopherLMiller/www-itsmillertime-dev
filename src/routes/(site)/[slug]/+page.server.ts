// src/routes/+page.js
import { payloadClient } from '$lib/api/payload-client.js';
import { PageSchema } from '$lib/schemas/zod/generated.js';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response.js';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export async function load({ params }) {
	const queryParams = {
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: params.slug
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

	if (pageData.totalDocs === 1) {
		return {
			page: pageData.docs[0],
			meta: pageData.docs[0].meta
		};
	}

	throw error(404, 'Page not found');
}
