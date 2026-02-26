import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from '../$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const sdk = getPayloadSDK(fetch);

	const [galleriesData, categoriesData, tagsData] = await Promise.all([
		sdk.find({
			collection: 'gallery-albums',
			sort: '-createdAt',
			limit: Number(url.searchParams.get('limit')) || 15,
			page: Number(url.searchParams.get('page')) || 1,
			depth: 2,
			where: {
				and: [
					{
						'settings.isNsfw': {
							equals: false
						}
					},
					{
						'settings.category.slug': {
							equals: url.searchParams.get('category') || undefined
						}
					},
					{
						'settings.tags.slug': {
							contains: url.searchParams.get('tag') || undefined
						}
					}
				]
			}
		}),
		sdk.find({
			collection: 'gallery-categories',
			limit: 100,
			sort: 'title'
		}),
		sdk.find({
			collection: 'gallery-tags',
			limit: 100,
			sort: 'title'
		})
	]);

	const { docs: galleries, ...meta } = galleriesData;
	const { docs: categories } = categoriesData;
	const { docs: tags } = tagsData;

	return { galleries, meta, categories, tags };
};
