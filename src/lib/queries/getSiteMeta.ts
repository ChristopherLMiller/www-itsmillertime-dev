import * as qs from 'qs-esm';

export const getSiteMeta = async (fetch) => {
	const queryParams = {
		depth: 1
	};
	const response = await await fetch(
		`/api/payload?endpoint=globals/site-meta&params=${qs.stringify(queryParams)}`
	);

	if (response.ok) {
		return response.json();
	}

	return null;
};
