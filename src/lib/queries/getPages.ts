import { PageSchema } from '$lib/schemas/zod/generated';
import { PayloadResponseSchema } from '$lib/schemas/zod/payload-response';
import * as qs from 'qs-esm';

export const getPages = async (fetch, params) => {
	const queryParams = {
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					}
				}
			]
		}
	};

	const mergedParams = { ...queryParams, ...params };

	const response = await await fetch(`/api/payload?endpoint=pages&${qs.stringify(mergedParams)}`);

	if (response.ok) {
		const data = await response.json();
		const parsedPages = PayloadResponseSchema(PageSchema).parse(data);
		return parsedPages;
	}

	return null;
};
