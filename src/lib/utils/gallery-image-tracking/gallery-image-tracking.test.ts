import { describe, expect, it } from 'vitest';
import { normalizeGalleryImageTracking, TRACKING_EVENT_TO_FIELD } from './types';

describe('normalizeGalleryImageTracking', () => {
	it('fills missing fields with zero', () => {
		expect(normalizeGalleryImageTracking({ views: 3 })).toEqual({
			views: 3,
			downloads: 0,
			likes: 0,
			dislikes: 0,
			comments: 0,
			shares: 0
		});
	});
});

describe('TRACKING_EVENT_TO_FIELD', () => {
	it('maps events to tracking fields', () => {
		expect(TRACKING_EVENT_TO_FIELD.view).toBe('views');
		expect(TRACKING_EVENT_TO_FIELD.share).toBe('shares');
	});
});
