export type GalleryImageTrackingEvent = 'view' | 'download' | 'like' | 'dislike' | 'share';

export type GalleryImageTrackingCounts = {
	views: number;
	downloads: number;
	likes: number;
	dislikes: number;
	comments: number;
	shares: number;
};

export const GALLERY_IMAGE_TRACKING_EVENTS: GalleryImageTrackingEvent[] = [
	'view',
	'download',
	'like',
	'dislike',
	'share'
];

export const TRACKING_EVENT_TO_FIELD: Record<
	GalleryImageTrackingEvent,
	keyof GalleryImageTrackingCounts
> = {
	view: 'views',
	download: 'downloads',
	like: 'likes',
	dislike: 'dislikes',
	share: 'shares'
};

export function normalizeGalleryImageTracking(
	tracking:
		| Partial<Record<keyof GalleryImageTrackingCounts, number | null | undefined>>
		| null
		| undefined
): GalleryImageTrackingCounts {
	return {
		views: tracking?.views ?? 0,
		downloads: tracking?.downloads ?? 0,
		likes: tracking?.likes ?? 0,
		dislikes: tracking?.dislikes ?? 0,
		comments: tracking?.comments ?? 0,
		shares: tracking?.shares ?? 0
	};
}
