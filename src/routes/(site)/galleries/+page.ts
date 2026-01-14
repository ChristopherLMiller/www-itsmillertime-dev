import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from '../$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const galleriesData = await getPayloadSDK(fetch).find({
		collection: 'gallery-albums',
		sort: '-createdAt',
		limit: Number(url.searchParams.get('limit')) || 15,
		page: Number(url.searchParams.get('page')) || 1,
		depth: 2,
		where: {
			'settings.isNsfw': {
				equals: false
			}
		}
	});

	const { docs: galleries, ...meta } = galleriesData;

	return { galleries, meta };
};
