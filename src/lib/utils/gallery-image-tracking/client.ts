import { browser } from '$app/environment';
import type { GalleryImageTrackingCounts, GalleryImageTrackingEvent } from './types';

const VIEW_KEY = (id: number) => `gallery-image-view:${id}`;
const DOWNLOAD_KEY = (id: number) => `gallery-image-download:${id}`;
const VOTE_KEY = (id: number) => `gallery-image-vote:${id}`;

export type GalleryImageVote = 'like' | 'dislike';

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
		return body.tracking ?? null;
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
		return body.tracking;
	} catch {
		return null;
	}
}
