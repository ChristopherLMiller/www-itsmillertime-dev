import { getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { canAccessGallerySettings } from '$lib/utils/gallery-access';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Lightweight preview images for a gallery album (polaroid stack hover).
 */
export const GET: RequestHandler = async (event) => {
	const { params, fetch, request } = event;
	const albumId = Number(params.albumId);
	if (!Number.isFinite(albumId)) {
		return json({ error: 'Invalid album ID' }, { status: 400 });
	}

	const user = await getMergedSessionUser(event);
	const sdk = getPayloadSDK(fetch, request);

	const album = await sdk.findByID({
		collection: 'gallery-albums',
		id: albumId,
		depth: 0,
		select: {
			settings: {
				isNsfw: true,
				visibility: true,
				permittedRoles: true,
				allowedUsers: true
			}
		},
		disableErrors: true
	});

	if (!album || !canAccessGallerySettings(album.settings, user)) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const imagesResult = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: albumId
			}
		},
		sort: '-createdAt',
		limit: 10,
		page: 1,
		depth: 0
	});

	const docs = (imagesResult.docs ?? []).map((doc) => ({
		thumbnailURL: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
		id: doc.id,
		blurhash: doc.blurhash ?? null,
		width: doc.sizes?.thumbnail?.width ?? doc.width ?? null,
		height: doc.sizes?.thumbnail?.height ?? doc.height ?? null,
		url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? doc.url ?? '',
		sizes: {
			thumbnail: {
				url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
				width: doc.sizes?.thumbnail?.width ?? null,
				height: doc.sizes?.thumbnail?.height ?? null
			}
		}
	}));

	return json({
		docs,
		totalDocs: imagesResult.totalDocs
	});
};
