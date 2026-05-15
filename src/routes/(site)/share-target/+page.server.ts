import { getPayloadSDK } from '$lib/payload.server';
import { payloadSwrInit } from '$lib/payloadSwr';
import {
	parseShareTargetDestination,
	SHARE_TARGET_DEST_COOKIE,
	SHARE_TARGET_FLASH_COOKIE
} from '$lib/share-target-destination';
import type { GalleryAlbum } from '$lib/types/payload-types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies, fetch, request, url }) => {
	const { session } = await parent();

	const destination = parseShareTargetDestination(cookies.get(SHARE_TARGET_DEST_COOKIE));

	let flashErrors: string[] = [];
	const flashRaw = cookies.get(SHARE_TARGET_FLASH_COOKIE);
	if (flashRaw) {
		cookies.delete(SHARE_TARGET_FLASH_COOKIE, { path: '/' });
		try {
			const parsed = JSON.parse(flashRaw) as { errors?: unknown };
			if (parsed?.errors && Array.isArray(parsed.errors)) {
				flashErrors = parsed.errors.map((e) => String(e));
			}
		} catch {
			/* ignore */
		}
	}

	let albums: Pick<GalleryAlbum, 'id' | 'title' | 'slug'>[] = [];
	if (session?.user) {
		try {
			const sdk = getPayloadSDK(fetch, request);
			const res = await sdk.find(
				{
					collection: 'gallery-albums',
					limit: 200,
					depth: 0,
					sort: 'title'
				},
				payloadSwrInit()
			);
			albums = res.docs.map((d) => ({
				id: d.id,
				title: d.title,
				slug: d.slug ?? null
			}));
		} catch {
			albums = [];
		}
	}

	const uploadedRaw = url.searchParams.get('uploaded');
	const failedRaw = url.searchParams.get('failed');
	const uploaded = uploadedRaw != null ? Number.parseInt(uploadedRaw, 10) : null;
	const failed = failedRaw != null ? Number.parseInt(failedRaw, 10) : null;

	return {
		session,
		destination,
		albums,
		flashErrors,
		uploadSummary:
			uploaded != null && Number.isFinite(uploaded)
				? { uploaded, failed: failed != null && Number.isFinite(failed) ? failed : 0 }
				: null
	};
};
