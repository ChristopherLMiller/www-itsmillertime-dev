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

	// Fetch all images for this gallery album
	const imagesData = await getPayloadSDK(fetch).find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: gallery.id
			}
		},
		limit: 1000, // Set a high limit to get all images
		depth: 1
	});

	// Replace the paginated images with all images
	const galleryWithAllImages = {
		...gallery,
		images: {
			docs: imagesData.docs,
			totalDocs: imagesData.totalDocs,
			hasNextPage: false
		}
	};

	return { gallery: galleryWithAllImages };
};
