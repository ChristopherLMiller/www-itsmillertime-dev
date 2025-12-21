import { getPayloadSDK } from '$lib/payload';
import type { PageLoad } from '../$types';

const STOCK_IMAGES = [
	{ id: 'photo-1511765224389-37f0e77cf0eb', alt: 'Warm sunrise over mountain ridge' },
	{ id: 'photo-1500530855697-b586d89ba3ee', alt: 'Fog rolling through evergreen forest' },
	{ id: 'photo-1507525428034-b723cf961d3e', alt: 'Ocean wave curling at sunset' },
	{ id: 'photo-1470770903676-69b98201ea1c', alt: 'Vintage camera on wooden table' },
	{ id: 'photo-1487412720507-e7ab37603c6f', alt: 'Colorful art supplies laid out' },
	{ id: 'photo-1441974231531-c6227db76b6e', alt: 'Stack of well-loved books' },
	{ id: 'photo-1500534314209-a25ddb2bd429', alt: 'Hiker overlooking alpine lake' },
	{ id: 'photo-1473186505569-9c61870c11f9', alt: 'Cup of latte art on desk' },
	{ id: 'photo-1451471016731-e963a8588be8', alt: 'City skyline at dusk' },
	{ id: 'photo-1469474968028-56623f02e42e', alt: 'Wind-swept desert dunes' },
	{ id: 'photo-1465311440653-ba9b1d9b0fbb', alt: 'Fern leaves in sunlight' },
	{ id: 'photo-1499084732479-de2c02d45fc4', alt: 'Creative workspace with laptop' }
];

const buildUnsplashUrl = (id: string, width: number, height: number) =>
	`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;

export const load: PageLoad = async ({ fetch, url }) => {
	const galleriesData = await getPayloadSDK(fetch).find({
		collection: 'gallery-albums',
		sort: '-createdAt',
		limit: Number(url.searchParams.get('limit')) || 15,
		page: Number(url.searchParams.get('page')) || 1,
		depth: 2
	});

	const { docs: galleries, ...meta } = galleriesData;

	if (galleries.length) {
		const prototypeGallery = galleries[0];
		const timestamp = new Date().toISOString();
		const stockPhotos = Array.from({ length: 15 }, (_, index) => {
			const image = STOCK_IMAGES[index % STOCK_IMAGES.length];
			const variant = Math.floor(index / STOCK_IMAGES.length);
			const baseId = 1000 + index + 1;
			const large = { width: 1600, height: 1200 };
			const medium = { width: 1200, height: 900 };
			const small = { width: 800, height: 600 };
			const thumbnail = { width: 480, height: 360 };
			const filenameBase = `stock-${index + 1}`;
			const cacheBuster = variant ? `&sat=${variant}` : '';
			return {
				id: -baseId,
				alt: image.alt,
				url: `${buildUnsplashUrl(image.id, large.width, large.height)}${cacheBuster}`,
				thumbnailURL: `${buildUnsplashUrl(image.id, thumbnail.width, thumbnail.height)}${cacheBuster}`,
				filename: `${filenameBase}.jpg`,
				width: large.width,
				height: large.height,
				blurhash: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
				sizes: {
					small: {
						url: `${buildUnsplashUrl(image.id, small.width, small.height)}${cacheBuster}`,
						width: small.width,
						height: small.height,
						filename: `${filenameBase}-sm.jpg`
					},
					medium: {
						url: `${buildUnsplashUrl(image.id, medium.width, medium.height)}${cacheBuster}`,
						width: medium.width,
						height: medium.height,
						filename: `${filenameBase}-md.jpg`
					},
					large: {
						url: `${buildUnsplashUrl(image.id, large.width, large.height)}${cacheBuster}`,
						width: large.width,
						height: large.height,
						filename: `${filenameBase}-lg.jpg`
					}
				}
			};
		});

		const mockImageDocs = stockPhotos.map((photo, index) => ({
			id: index + 1,
			title: photo.alt,
			image: photo
		}));

		const mockGallery = {
			...prototypeGallery,
			id: -1,
			slug: 'mock-polaroid-stack',
			title: 'Mock Gallery (Stock Photos)',
			meta: {
				...prototypeGallery.meta,
				image: stockPhotos[0]
			},
			images: {
				docs: mockImageDocs as any,
				totalDocs: stockPhotos.length
			},
			tracking: {
				...prototypeGallery?.tracking,
				totalImages: stockPhotos.length
			},
			createdAt: timestamp,
			updatedAt: timestamp
		} as typeof prototypeGallery;

		galleries.unshift(mockGallery);
	}

	return { galleries, meta };
};
