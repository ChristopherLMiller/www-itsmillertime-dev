import { getPayloadSDK } from '$lib/payload';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const IMAGE_BATCH_SIZE = 30;

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
					height: true,
					sizes: {
						og: { url: true, width: true, height: true }
					}
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

	// First page: ids (+ per-image NSFW for client filtering); each grid cell fetches full row via API.
	const imagesData = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: gallery.id
			}
		},
		limit: IMAGE_BATCH_SIZE,
		page: 1,
		depth: 0,
		select: {
			id: true,
			width: true,
			height: true,
			blurhash: true,
			settings: { isNsfw: true }
		}
	});

	const galleryWithPagedImages = {
		...gallery,
		meta: gallery.meta,
		images: {
			docs: imagesData.docs,
			totalDocs: imagesData.totalDocs,
			hasNextPage: imagesData.hasNextPage,
			nextPage: imagesData.nextPage,
			page: imagesData.page,
			totalPages: imagesData.totalPages
		}
	};

	// Meta for the Meta component (svelte:head) - must be in page.data for SSR
	const metaImage = typeof gallery.meta?.image === 'object' ? gallery.meta.image : null;

	return {
		gallery: galleryWithPagedImages,
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
