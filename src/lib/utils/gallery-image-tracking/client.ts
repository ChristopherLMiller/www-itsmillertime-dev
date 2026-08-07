import { browser } from '$app/environment';
import type { GalleryImageTrackingCounts, GalleryImageTrackingEvent } from './types';

const VIEW_KEY = (id: number) => `gallery-image-view:${id}`;
const DOWNLOAD_KEY = (id: number) => `gallery-image-download:${id}`;
const VOTE_KEY = (id: number) => `gallery-image-vote:${id}`;

export type GalleryImageVote = 'like' | 'dislike';

const countsCache = new Map<number, GalleryImageTrackingCounts>();
const openInflight = new Map<number, Promise<GalleryImageTrackingCounts | null>>();

export function getStoredGalleryImageVote(galleryImageId: number): GalleryImageVote | null {
	if (!browser) return null;
	const raw = localStorage.getItem(VOTE_KEY(galleryImageId));
	return raw === 'like' || raw === 'dislike' ? raw : null;
}

function shouldSkipEvent(galleryImageId: number, event: GalleryImageTrackingEvent): boolean {
	if (!browser) return true;

	if (event === 'view') {
		return sessionStorage.getItem(VIEW_KEY(galleryImageId)) === '1';
	}

	if (event === 'download') {
		return sessionStorage.getItem(DOWNLOAD_KEY(galleryImageId)) === '1';
	}

	if (event === 'like' || event === 'dislike') {
		return getStoredGalleryImageVote(galleryImageId) != null;
	}

	return false;
}

function markEventRecorded(galleryImageId: number, event: GalleryImageTrackingEvent): void {
	if (!browser) return;

	if (event === 'view') {
		sessionStorage.setItem(VIEW_KEY(galleryImageId), '1');
		return;
	}

	if (event === 'download') {
		sessionStorage.setItem(DOWNLOAD_KEY(galleryImageId), '1');
		return;
	}

	if (event === 'like' || event === 'dislike') {
		localStorage.setItem(VOTE_KEY(galleryImageId), event);
	}
}

export async function fetchGalleryImageTrackingClient(
	galleryImageId: number
): Promise<GalleryImageTrackingCounts | null> {
	if (!browser) return null;

	try {
		const res = await fetch(`/api/gallery/images/${galleryImageId}/tracking`);
		if (!res.ok) return null;
		const body = (await res.json()) as { tracking?: GalleryImageTrackingCounts };
		const tracking = body.tracking ?? null;
		if (tracking) countsCache.set(galleryImageId, tracking);
		return tracking;
	} catch {
		return null;
	}
}

export async function recordGalleryImageTracking(
	galleryImageId: number,
	event: GalleryImageTrackingEvent
): Promise<GalleryImageTrackingCounts | null> {
	if (!browser || shouldSkipEvent(galleryImageId, event)) return null;

	try {
		const res = await fetch(`/api/gallery/images/${galleryImageId}/tracking`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ event })
		});
		if (!res.ok) return null;

		const body = (await res.json()) as { tracking?: GalleryImageTrackingCounts };
		if (!body.tracking) return null;

		markEventRecorded(galleryImageId, event);
		countsCache.set(galleryImageId, body.tracking);
		return body.tracking;
	} catch {
		return null;
	}
}

/**
 * One network round-trip when opening a lightbox image:
 * - First view this session → POST view (response includes counts)
 * - Already viewed → use memory cache, else one GET
 * Concurrent open effects for the same id share a single in-flight promise.
 */
export async function ensureGalleryImageTrackingOnOpen(
	galleryImageId: number
): Promise<GalleryImageTrackingCounts | null> {
	if (!browser) return null;

	const existing = openInflight.get(galleryImageId);
	if (existing) return existing;

	const promise = (async (): Promise<GalleryImageTrackingCounts | null> => {
		if (!shouldSkipEvent(galleryImageId, 'view')) {
			// Claim the view slot immediately so effect re-runs do not POST again.
			markEventRecorded(galleryImageId, 'view');
			const fromView = await recordGalleryImageTrackingAfterClaim(galleryImageId, 'view');
			if (fromView) return fromView;
			return fetchGalleryImageTrackingClient(galleryImageId);
		}

		const cached = countsCache.get(galleryImageId);
		if (cached) return cached;
		return fetchGalleryImageTrackingClient(galleryImageId);
	})();

	openInflight.set(galleryImageId, promise);
	try {
		return await promise;
	} finally {
		openInflight.delete(galleryImageId);
	}
}

/** POST after the client already reserved the dedupe key (avoids shouldSkip short-circuit). */
async function recordGalleryImageTrackingAfterClaim(
	galleryImageId: number,
	event: GalleryImageTrackingEvent
): Promise<GalleryImageTrackingCounts | null> {
	try {
		const res = await fetch(`/api/gallery/images/${galleryImageId}/tracking`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ event })
		});
		if (!res.ok) return null;
		const body = (await res.json()) as { tracking?: GalleryImageTrackingCounts };
		if (!body.tracking) return null;
		countsCache.set(galleryImageId, body.tracking);
		return body.tracking;
	} catch {
		return null;
	}
}
