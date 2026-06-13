import {
	fetchGalleryImageTracking,
	incrementGalleryImageTracking
} from '$lib/utils/gallery-image-tracking/server';
import {
	GALLERY_IMAGE_TRACKING_EVENTS,
	type GalleryImageTrackingEvent
} from '$lib/utils/gallery-image-tracking/types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function parseGalleryImageId(raw: string | undefined): number | null {
	const id = Number(raw);
	return Number.isFinite(id) && id > 0 ? id : null;
}

export const GET: RequestHandler = async ({ params, fetch, request }) => {
	const galleryImageId = parseGalleryImageId(params.id);
	if (galleryImageId == null) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	const tracking = await fetchGalleryImageTracking(galleryImageId, fetch, request);
	if (!tracking) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json({ tracking });
};

export const POST: RequestHandler = async ({ params, request, fetch }) => {
	const galleryImageId = parseGalleryImageId(params.id);
	if (galleryImageId == null) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	let body: { event?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const event = body.event as GalleryImageTrackingEvent | undefined;
	if (!event || !GALLERY_IMAGE_TRACKING_EVENTS.includes(event)) {
		return json({ error: 'Invalid tracking event' }, { status: 400 });
	}

	const result = await incrementGalleryImageTracking(galleryImageId, event, fetch);
	if (!result.ok) {
		const status =
			result.error === 'Not found' ? 404 : result.error === 'Invalid request' ? 400 : 502;
		return json({ error: result.error }, { status });
	}

	return json({ tracking: result.tracking });
};
