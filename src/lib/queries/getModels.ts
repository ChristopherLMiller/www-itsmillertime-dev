import { ModelSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import * as qs from 'qs-esm';

export const getModels = async (fetch, params) => {
	const queryParams = {
		sort: '-model_meta.completionDate',
		limit: 10,
		page: 1,
		select: {
			id: true,
			title: true,
			createdAt: true,
			updatedAt: true,
			slug: true,
			model_meta: true,
			clockify_project: true
		}
	};

	// Merge the passed in params with the queryParams
	const mergedParams = { ...queryParams, ...params };

	// Now fetch the data
	const response = await fetch(`/api/payload?endpoint=models&${qs.stringify(mergedParams)}`);

	if (response.ok) {
		const data = await response.json();

		// use zod to validate the data, should be contained inside a PayloadResponseSchema
		const parsedModels = PayloadResponseSchema(ModelSchema).parse(data);

		const { docs: models, ...meta } = parsedModels;

		return {
			models,
			meta
		};
	}

	return null;
};
