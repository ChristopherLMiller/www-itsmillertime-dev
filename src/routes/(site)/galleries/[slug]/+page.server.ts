import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, request, url }) => {
	const { slug } = params;
	const sdk = getPayloadSDK(fetch, request);

	const galleriesData = await sdk.find({
		collection: 'gallery-albums',
		where: {
			slug: {
				equals: slug
			}
		},
		limit: 1,
		depth: 2,
		select: {
			id: true,
			slug: true,
			title: true,
			settings: {
				isNsfw: true,
				visibility: true,
				category: { title: true },
				tags: { title: true }
			},
			content: true,
			meta: {
				description: true,
				title: true,
				image: {
					id: true,
					url: true,
					alt: true,
					width: true,
					height: true
				}
			},
			createdAt: true,
			updatedAt: true
		}
	});

	const gallery = galleriesData.docs[0];

	if (!gallery) {
		throw error(404, 'Gallery not found');
	}

	// Fetch all images for this gallery album
	// Note: No select on gallery-images — Payload's select returns sizes in a format that breaks
	// the Lightbox/Image cascade (sizes.xlarge?.url etc.). Full fetch required for images to load.
	const imagesData = await sdk.find({
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
		meta: gallery.meta,
		images: {
			docs: imagesData.docs,
			totalDocs: imagesData.totalDocs,
			hasNextPage: false
		}
	};

	// Meta for the Meta component (svelte:head) - must be in page.data for SSR
	const metaImage = typeof gallery.meta?.image === 'object' ? gallery.meta.image : null;

	return {
		gallery: galleryWithAllImages,
		meta: {
			title: gallery.title,
			metaTitle: gallery.meta?.title ?? gallery.title,
			description: gallery.meta?.description ?? undefined,
			metaDescription: gallery.meta?.description ?? undefined,
			image: metaImage,
			metaImage,
			canonicalURL: `${url.origin}/galleries/${slug}`
		}
	};
};
