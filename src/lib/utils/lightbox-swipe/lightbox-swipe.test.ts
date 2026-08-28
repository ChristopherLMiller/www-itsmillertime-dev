import { describe, expect, it } from 'vitest';

import { lightboxSwipeFromDelta } from './lightbox-swipe';

describe('lightboxSwipeFromDelta', () => {
	it('ignores short horizontal moves', () => {
		expect(lightboxSwipeFromDelta(40, 0)).toBeNull();
	});

	it('treats a leftward flick as next', () => {
		expect(lightboxSwipeFromDelta(80, 10)).toBe('next');
	});

	it('treats a rightward flick as previous', () => {
		expect(lightboxSwipeFromDelta(-80, 8)).toBe('previous');
	});

	it('ignores vertical scrolling with horizontal jitter', () => {
		expect(lightboxSwipeFromDelta(60, 90)).toBeNull();
		expect(lightboxSwipeFromDelta(-55, 70)).toBeNull();
	});
});
