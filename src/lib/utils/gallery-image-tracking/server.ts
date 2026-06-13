import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { GalleryImage } from '$lib/types/payload-types';
import {
	normalizeGalleryImageTracking,
	type GalleryImageTrackingCounts,
	type GalleryImageTrackingEvent
} from './types';

export async function fetchGalleryImageTracking(
	galleryImageId: number,
	fetch: typeof globalThis.fetch,
	request: Request
): Promise<GalleryImageTrackingCounts | null> {
	const sdk = getPayloadSDK(fetch, request);

	let doc: GalleryImage | null;
	try {
		doc = await sdk.findByID({
			collection: 'gallery-images',
			id: galleryImageId,
			depth: 0,
			disableErrors: true
		});
	} catch {
		return null;
	}

	if (!doc) return null;
	return normalizeGalleryImageTracking(doc.tracking ?? undefined);
}

export async function incrementGalleryImageTracking(
	galleryImageId: number,
	event: GalleryImageTrackingEvent,
	fetchFn: typeof globalThis.fetch = globalThis.fetch
): Promise<{ ok: true; tracking: GalleryImageTrackingCounts } | { ok: false; error: string }> {
	const res = await fetchFn(`${PUBLIC_PAYLOAD_URL}/api/gallery-image-tracking`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json' },
		body: JSON.stringify({ id: galleryImageId, event })
	});

	let body: { tracking?: GalleryImageTrackingCounts; error?: string } = {};
	try {
		body = (await res.json()) as typeof body;
	} catch {
		body = {};
	}

	if (!res.ok) {
		const message =
			body.error ??
			(res.status === 404 ? 'Not found' : res.status === 400 ? 'Invalid request' : 'Failed to update tracking');
		return { ok: false, error: message };
	}

	if (!body.tracking) {
		return { ok: false, error: 'Failed to update tracking' };
	}

	return { ok: true, tracking: normalizeGalleryImageTracking(body.tracking) };
}
