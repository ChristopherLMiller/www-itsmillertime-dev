import {
	normalizeGalleriesQuery,
	type GalleriesListCacheData,
	type GalleriesListPagination,
	type GalleryAlbumCacheData,
	type GalleryAlbumImageDoc,
	type GalleryAlbumPageDoc
} from '$lib/cache/galleryCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { GalleryAlbum, GalleryCategory, GalleryTag } from '$lib/types/payload-types';
import {
	canAccessGallerySettings,
	type GalleryAccessUser
} from '$lib/utils/gallery-access';

export const GALLERY_ALBUM_IMAGE_BATCH_SIZE = 30;

export type GalleryLoadOptions = {
	fetch?: typeof globalThis.fetch;
	request?: Request;
	user?: GalleryAccessUser | null;
};

const albumSettingsSelect = {
	isNsfw: true,
	visibility: true,
	permittedRoles: true,
	allowedUsers: true,
	defaultSort: true
} as const;

export async function loadGalleriesListPageData(
	pageRaw: number,
	limitRaw: number,
	categoryRaw?: string | null,
	tagRaw?: string | null,
	options: GalleryLoadOptions = {}
): Promise<GalleriesListCacheData> {
	const query = normalizeGalleriesQuery(pageRaw, limitRaw, categoryRaw, tagRaw);
	const { fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);

	const [galleriesData, categoriesData, tagsData] = await Promise.all([
		sdk.find({
			collection: 'gallery-albums',
			sort: '-createdAt',
			limit: query.limit,
			page: query.page,
			depth: 1,
			select: {
				slug: true,
				title: true,
				settings: {
					isNsfw: true,
					visibility: true
				},
				meta: {
					description: true,
					image: true
				}
			},
			where: {
				and: [
					{
						'settings.category.slug': {
							equals: query.category || undefined
						}
					},
					{
						'settings.tags.slug': {
							contains: query.tag || undefined
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

	const { docs: galleries, ...meta } = galleriesData;

	return {
		query,
		galleries: galleries as GalleryAlbum[],
		meta: meta as GalleriesListPagination,
		categories: categoriesData.docs as GalleryCategory[],
		tags: tagsData.docs as GalleryTag[]
	};
}

export async function loadGalleryAlbumPageData(
	slug: string,
	origin: string,
	options: GalleryLoadOptions = {}
): Promise<GalleryAlbumCacheData | null> {
	const { fetch, request, user = null } = options;
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
			slug: true,
			title: true,
			settings: {
				...albumSettingsSelect,
				category: true,
				tags: true
			},
			content: true,
			meta: {
				description: true,
				title: true,
				image: true
			},
			createdAt: true,
			updatedAt: true
		}
	});

	const gallery = galleriesData.docs[0];
	if (!gallery || !canAccessGallerySettings(gallery.settings, user)) {
		return null;
	}

	const imageSort = gallery.settings?.defaultSort ?? '-createdAt';
	const imagesData = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: gallery.id
			}
		},
		sort: imageSort,
		limit: GALLERY_ALBUM_IMAGE_BATCH_SIZE,
		page: 1,
		depth: 0,
		select: {
			id: true,
			width: true,
			height: true,
			blurhash: true,
			medusaProductId: true,
			settings: { isNsfw: true }
		}
	});

	const galleryWithPagedImages = {
		...gallery,
		meta: gallery.meta,
		images: {
			docs: imagesData.docs as GalleryAlbumImageDoc[],
			totalDocs: imagesData.totalDocs,
			hasNextPage: Boolean(imagesData.hasNextPage),
			nextPage: imagesData.nextPage ?? null,
			page: imagesData.page ?? 1,
			totalPages: imagesData.totalPages ?? 1
		}
	} as GalleryAlbumPageDoc;

	const metaImage = typeof gallery.meta?.image === 'object' ? gallery.meta.image : null;

	return {
		slug,
		gallery: galleryWithPagedImages,
		meta: {
			title: gallery.title,
			metaTitle: gallery.meta?.title ?? gallery.title,
			description: gallery.meta?.description ?? undefined,
			metaDescription: gallery.meta?.description ?? undefined,
			image: metaImage,
			metaImage,
			canonicalURL: `${origin}/galleries/${slug}`
		}
	};
}

export { albumSettingsSelect };
