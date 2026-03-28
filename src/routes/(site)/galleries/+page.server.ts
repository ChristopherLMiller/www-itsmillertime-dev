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
			depth: 1,
			select: {
				id: true,
				slug: true,
				title: true,
				settings: {
					isNsfw: true,
					visibility: true
				},
				meta: {
					description: true,
					// Cover id + dimensions for layout/aspect before client preview fetch
					image: { id: true, width: true, height: true, blurhash: true }
				}
			},
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
			sort: 'title',
			select: { id: true, slug: true, title: true }
		}),
		sdk.find({
			collection: 'gallery-tags',
			limit: 100,
			sort: 'title',
			select: { id: true, slug: true, title: true }
		})
	]);

	const { docs: rawGalleries, ...meta } = galleriesData;
	const { docs: categories } = categoriesData;
	const { docs: tags } = tagsData;

	// Initial load only includes gallery metadata and the featured (SEO meta) image.
	// Polaroid stack images are fetched on hover via /api/gallery/albums/[albumId].
	const galleries = rawGalleries;

	return { galleries, meta, categories, tags };
};
