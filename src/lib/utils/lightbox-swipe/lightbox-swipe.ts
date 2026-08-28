const DEFAULT_SWIPE_THRESHOLD = 50;

/** Next is a leftward finger move (positive startX − endX). Vertical-dominant drags are ignored. */
export function lightboxSwipeFromDelta(
	deltaX: number,
	deltaY: number,
	threshold = DEFAULT_SWIPE_THRESHOLD
): 'next' | 'previous' | null {
	if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return null;
	if (Math.abs(deltaX) < threshold) return null;
	if (Math.abs(deltaX) <= Math.abs(deltaY)) return null;
	return deltaX > 0 ? 'next' : 'previous';
}

export function touchStartedInNoSwipe(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest('[data-lightbox-no-swipe]') != null;
}
