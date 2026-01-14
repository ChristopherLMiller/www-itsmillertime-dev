import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const { slug } = params;

	const galleriesData = await getPayloadSDK(fetch).find({
		collection: 'gallery-albums',
		where: {
			slug: {
				equals: slug
			}
		},
		limit: 1,
		depth: 2
	});

	const gallery = galleriesData.docs[0];

	if (!gallery) {
		throw error(404, 'Gallery not found');
	}

	return { gallery };
};
