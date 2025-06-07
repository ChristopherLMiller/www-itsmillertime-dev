import { payloadClient } from '$lib/api/payload-client';
import { SiteMetaSchema, SiteNavigationSchema } from '$lib/schemas/zod/generated';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export async function load() {
	const metaQueryParams = {
		depth: 1
	};

	const globalMetaData = await payloadClient.fetchWithValidation(
		`/globals/site-meta?${qs.stringify(metaQueryParams)}`,
		SiteMetaSchema
	);

	const navigationQueryParams = {
		depth: 1,
		draft: true,
		sort: '+order'
	};
	const globalNavigationData = await payloadClient.fetchWithValidation(
		`/globals/site-navigation?${qs.stringify(navigationQueryParams)}`,
		SiteNavigationSchema
	);

	if (!globalMetaData && !globalNavigationData) {
		return error(500, 'Failed to fetch global data');
	}

	return {
		navigation: globalNavigationData,
		siteMeta: globalMetaData
	};
}
