import { getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { canAccessGallerySettings } from '$lib/utils/gallery-access';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_IMAGE_BATCH_SIZE = 30;
const MAX_IMAGE_BATCH_SIZE = 60;

export const GET: RequestHandler = async (event) => {
	const { params, url, fetch, request } = event;
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

	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
	const requestedLimit = Number(url.searchParams.get('limit') ?? String(DEFAULT_IMAGE_BATCH_SIZE));
	const limit = Math.min(
		MAX_IMAGE_BATCH_SIZE,
		Math.max(1, requestedLimit || DEFAULT_IMAGE_BATCH_SIZE)
	);
	const idsOnly = url.searchParams.get('idsOnly') === '1';

	const imagesResult = await sdk.find({
		collection: 'gallery-images',
		where: {
			albums: {
				contains: albumId
			}
		},
		limit,
		page,
		depth: idsOnly ? 0 : 1,
		...(idsOnly
			? {
					select: {
						id: true,
						width: true,
						height: true,
						blurhash: true,
						settings: { isNsfw: true }
					}
				}
			: {})
	});

	return json({
		docs: imagesResult.docs ?? [],
		page: imagesResult.page,
		nextPage: imagesResult.nextPage,
		hasNextPage: imagesResult.hasNextPage,
		totalPages: imagesResult.totalPages,
		totalDocs: imagesResult.totalDocs
	});
};
