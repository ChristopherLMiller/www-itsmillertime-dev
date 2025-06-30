import { payloadClient } from '$lib/api/payload-client';
import { ModelSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import * as qs from 'qs-esm';

export async function load() {
	const queryParams = {
		sort: '-model_meta.completionDate',
		limit: 100,
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

	const modelsData = await payloadClient.fetchWithValidation(
		`/models?${qs.stringify(queryParams)}`,
		PayloadResponseSchema(ModelSchema)
	);

	const { docs: models, ...meta } = modelsData;

	return {
		models,
		meta
	};
}
