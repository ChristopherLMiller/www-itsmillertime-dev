import { getPayloadSDK } from '$lib/payload';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, request, url }) => {
	const sdk = getPayloadSDK(fetch, request);

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

	const { docs: rawGalleries, ...meta } = galleriesData;
	const { docs: categories } = categoriesData;
	const { docs: tags } = tagsData;

	// Don't load album images on initial load - only the featured (meta) image.
	// Images are fetched on hover via /api/gallery-album-images/[albumId]
	const galleries = rawGalleries.map((g) => ({
		...g,
		images: { docs: [], totalDocs: 0 }
	}));

	return { galleries, meta, categories, tags };
};
