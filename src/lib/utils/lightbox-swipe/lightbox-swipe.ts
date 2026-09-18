const DEFAULT_SWIPE_THRESHOLD = 50;
const DEFAULT_MOVE_THRESHOLD = 4;

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

/**
 * Classify an unzoomed pointer gesture. `deltaX`/`deltaY` are start − end
 * (same as `lightboxSwipeFromDelta`).
 */
export function unzoomedPointerIntent(
	deltaX: number,
	deltaY: number,
	options?: { moveThreshold?: number; swipeThreshold?: number }
): 'click' | 'next' | 'previous' | null {
	const moveThreshold = options?.moveThreshold ?? DEFAULT_MOVE_THRESHOLD;
	if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return null;
	if (Math.hypot(deltaX, deltaY) <= moveThreshold) return 'click';
	return lightboxSwipeFromDelta(deltaX, deltaY, options?.swipeThreshold ?? DEFAULT_SWIPE_THRESHOLD);
}

export function touchStartedInNoSwipe(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest('[data-lightbox-no-swipe]') != null;
}
