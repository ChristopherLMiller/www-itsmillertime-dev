import { describe, expect, it } from 'vitest';

import { lightboxSwipeFromDelta, unzoomedPointerIntent } from './lightbox-swipe';

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

describe('unzoomedPointerIntent', () => {
	it('treats tiny movement as a click', () => {
		expect(unzoomedPointerIntent(2, 1)).toBe('click');
		expect(unzoomedPointerIntent(0, 0)).toBe('click');
	});

	it('treats a horizontal drag as next or previous', () => {
		expect(unzoomedPointerIntent(80, 6)).toBe('next');
		expect(unzoomedPointerIntent(-80, 4)).toBe('previous');
	});

	it('ignores vertical-dominant drags and mid-length horizontal noise', () => {
		expect(unzoomedPointerIntent(20, 4)).toBeNull();
		expect(unzoomedPointerIntent(60, 90)).toBeNull();
	});
});
