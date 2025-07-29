import { ModelSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export const getModel = async (fetch, slug) => {
	const queryParams = {
		where: {
			slug: {
				equals: slug
			}
		},
		select: {
			id: true,
			title: true,
			createdAt: true,
			updatedAt: true,
			slug: true,
			model_meta: true,
			clockify_project: true,
			buildLog: true,
			image: true,
			meta: true
		}
	};

	// Now fetch the data
	const response = await fetch(`/api/payload?endpoint=models&${qs.stringify(queryParams)}`);

	if (response.ok) {
		const data = await response.json();

		// use zod to validate the data, should be contained inside a PayloadResponseSchema
		const parsedModels = PayloadResponseSchema(ModelSchema).parse(data);

		if (parsedModels.totalDocs === 1) {
			return {
				model: parsedModels.docs[0]
			};
		}
		return error(404, 'Model not found');
	}

	return error(500, 'Error fetching model');
};
