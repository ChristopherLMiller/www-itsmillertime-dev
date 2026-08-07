import { galleryImageDocToDisplayMedia, type GalleryGridMedia } from '$lib/utils/gallery-image-display';

const inflightBasic = new Map<number, Promise<GalleryGridMedia | null>>();
const inflightFull = new Map<number, Promise<GalleryGridMedia | null>>();

const BATCH_SIZE = 6;
const BATCH_WAIT_MS = 40;
/** Cap parallel batch HTTP calls so mounting a full page doesn't stampede. */
const MAX_IN_FLIGHT_BATCHES = 2;

type QueueItem = {
	id: number;
	albumIsNsfw: boolean;
	data: 'basic' | 'full';
	resolve: (value: GalleryGridMedia | null) => void;
};

const queue: QueueItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightBatches = 0;

function scheduleFlush() {
	if (queue.length >= BATCH_SIZE) {
		if (flushTimer != null) {
			clearTimeout(flushTimer);
			flushTimer = null;
		}
		void flushBatches();
		return;
	}
	if (flushTimer == null) {
		flushTimer = setTimeout(() => {
			flushTimer = null;
			void flushBatches();
		}, BATCH_WAIT_MS);
	}
}

async function flushBatches() {
	while (queue.length > 0 && inFlightBatches < MAX_IN_FLIGHT_BATCHES) {
		// Keep basic and full requests in separate HTTP batches.
		const mode = queue[0]?.data ?? 'basic';
		const batch: QueueItem[] = [];
		while (batch.length < BATCH_SIZE && queue.length > 0 && queue[0].data === mode) {
			batch.push(queue.shift()!);
		}
		if (batch.length === 0) break;
		inFlightBatches += 1;
		void runBatch(batch, mode).finally(() => {
			inFlightBatches -= 1;
			if (queue.length > 0) void flushBatches();
		});
	}
}

async function runBatch(batch: QueueItem[], data: 'basic' | 'full') {
	const ids = batch.map((item) => item.id);
	try {
		const res = await fetch(`/api/gallery/images/batch?ids=${ids.join(',')}&data=${data}`);
		if (!res.ok) {
			for (const item of batch) item.resolve(null);
			return;
		}
		const payload: unknown = await res.json();
		const docs =
			typeof payload === 'object' &&
			payload !== null &&
			Array.isArray((payload as { docs?: unknown }).docs)
				? (payload as { docs: unknown[] }).docs
				: [];
		const byId = new Map<number, unknown>();
		for (const doc of docs) {
			if (typeof doc === 'object' && doc !== null && 'id' in doc) {
				const id = (doc as { id: unknown }).id;
				if (typeof id === 'number') byId.set(id, doc);
			}
		}
		for (const item of batch) {
			const doc = byId.get(item.id);
			item.resolve(doc ? galleryImageDocToDisplayMedia(doc, item.albumIsNsfw) : null);
		}
	} catch {
		for (const item of batch) item.resolve(null);
	}
}

function enqueue(
	galleryImageId: number,
	albumIsNsfw: boolean,
	data: 'basic' | 'full',
	inflight: Map<number, Promise<GalleryGridMedia | null>>
): Promise<GalleryGridMedia | null> {
	const existing = inflight.get(galleryImageId);
	if (existing) return existing;

	const promise = new Promise<GalleryGridMedia | null>((resolve) => {
		queue.push({ id: galleryImageId, albumIsNsfw, data, resolve });
		scheduleFlush();
	}).finally(() => {
		inflight.delete(galleryImageId);
	});

	inflight.set(galleryImageId, promise);
	return promise;
}

/**
 * Grid/polaroid preview: depth-0 docs, no Medusa. Coalesced into HTTP batches.
 */
export function fetchGalleryImageFullForPolaroid(
	galleryImageId: number,
	albumIsNsfw: boolean
): Promise<GalleryGridMedia | null> {
	return enqueue(galleryImageId, albumIsNsfw, 'basic', inflightBasic);
}

/**
 * Lightbox detail: depth-1 docs + Medusa commerce when present.
 */
export function fetchGalleryImageFullForLightbox(
	galleryImageId: number,
	albumIsNsfw: boolean
): Promise<GalleryGridMedia | null> {
	return enqueue(galleryImageId, albumIsNsfw, 'full', inflightFull);
}

/** Test helper — not for app code. */
export function __resetGalleryImageFullFetchForTests() {
	inflightBasic.clear();
	inflightFull.clear();
	queue.length = 0;
	inFlightBatches = 0;
	if (flushTimer != null) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}
}
