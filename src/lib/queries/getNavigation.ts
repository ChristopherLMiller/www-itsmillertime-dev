import * as qs from 'qs-esm';

export const getNavigation = async (fetch) => {
	const queryParams = {
		depth: 1,
		draft: true,
		sort: '+order'
	};
	const response = await await fetch(
		`/api/payload?endpoint=globals/site-navigation&params=${qs.stringify(queryParams)}`
	);

	if (response.ok) {
		return response.json();
	}

	return null;
};
