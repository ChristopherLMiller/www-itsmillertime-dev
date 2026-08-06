export type ImageZoomPanHandle = {
	reset: () => void;
	isZoomed: () => boolean;
};

export type ImageZoomPanTransform = {
	scale: number;
	tx: number;
	ty: number;
};

export type ImageZoomPanOptions = {
	minScale?: number;
	maxScale?: number;
	/** Scale applied on a plain click when not zoomed. */
	clickZoomScale?: number;
	/** Optional mutable handle the action fills in (reset / isZoomed). */
	handle?: ImageZoomPanHandle;
	/** Fired when zoomed-in state toggles (scale > 1). */
	onZoomChange?: (zoomed: boolean) => void;
	/** Fired whenever scale/translate are applied (including identity). */
	onTransform?: (t: ImageZoomPanTransform) => void;
	/**
	 * When false, skip writing CSS transform on the node (canvas owns pixels).
	 * Hit-testing still uses the node; keep true if the node must grow with scale.
	 */
	applyCssTransform?: boolean;
};

type Point = { x: number; y: number };

const MOVE_THRESHOLD_PX = 4;

/**
 * Svelte action: wheel / pinch / click zoom and drag-pan.
 * Transform uses center origin: translate then scale.
 */
export function imageZoomPan(node: HTMLElement, options: ImageZoomPanOptions = {}) {
	let minScale = options.minScale ?? 1;
	let maxScale = options.maxScale ?? 5;
	let clickZoomScale = options.clickZoomScale ?? 2.5;
	let onZoomChange = options.onZoomChange;
	let onTransform = options.onTransform;
	let applyCssTransform = options.applyCssTransform ?? true;
	let handle = options.handle;

	let scale = 1;
	let tx = 0;
	let ty = 0;
	let zoomed = false;

	let pointers = new Map<number, Point>();
	let pinchStartDist = 0;
	let pinchStartScale = 1;
	let dragging = false;
	let dragOrigin: Point | null = null;
	let panAtDragStart: Point = { x: 0, y: 0 };
	let pointerDownAt: Point | null = null;
	let movedDuringPointer = false;
	let activePointerId: number | null = null;

	function bindHandle() {
		if (!handle) return;
		handle.reset = reset;
		handle.isZoomed = () => scale > 1.001;
	}

	function setZoomed(next: boolean) {
		if (zoomed === next) return;
		zoomed = next;
		node.classList.toggle('is-zoomed', zoomed);
		onZoomChange?.(zoomed);
	}

	function apply() {
		node.style.transformOrigin = 'center center';
		if (applyCssTransform) {
			node.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
			node.style.willChange = scale > 1 || tx !== 0 || ty !== 0 ? 'transform' : 'auto';
		} else {
			node.style.transform = '';
			node.style.willChange = 'auto';
		}
		node.style.cursor = scale > 1.001 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';
		setZoomed(scale > 1.001);
		onTransform?.({ scale, tx, ty });
	}

	function clampPan() {
		if (scale <= 1.001) {
			tx = 0;
			ty = 0;
			return;
		}

		const parent = node.parentElement ?? node;
		const parentW = parent.clientWidth;
		const parentH = parent.clientHeight;
		const scaledW = node.offsetWidth * scale;
		const scaledH = node.offsetHeight * scale;
		const maxX = Math.max(0, (scaledW - parentW) / 2);
		const maxY = Math.max(0, (scaledH - parentH) / 2);
		tx = Math.min(maxX, Math.max(-maxX, tx));
		ty = Math.min(maxY, Math.max(-maxY, ty));
	}

	/** Zoom toward a client point; keeps that screen point stable. */
	function zoomAt(clientX: number, clientY: number, nextScale: number) {
		// Use the untransformed frame center (parent), not the scaled node's bounding box.
		const parent = node.parentElement ?? node;
		const parentRect = parent.getBoundingClientRect();
		const centerX = parentRect.left + parentRect.width / 2;
		const centerY = parentRect.top + parentRect.height / 2;
		const ox = clientX - centerX;
		const oy = clientY - centerY;

		const prev = Math.max(scale, 0.0001);
		const clamped = Math.min(maxScale, Math.max(minScale, nextScale));
		if (Math.abs(clamped - prev) < 0.0001) {
			if (clamped <= minScale) {
				tx = 0;
				ty = 0;
				scale = minScale;
				apply();
			}
			return;
		}

		const localX = (ox - tx) / prev;
		const localY = (oy - ty) / prev;

		scale = clamped;
		if (scale <= minScale) {
			scale = minScale;
			tx = 0;
			ty = 0;
		} else {
			tx = ox - localX * scale;
			ty = oy - localY * scale;
			clampPan();
		}
		apply();
	}

	function reset() {
		scale = minScale;
		tx = 0;
		ty = 0;
		dragging = false;
		dragOrigin = null;
		pointerDownAt = null;
		activePointerId = null;
		movedDuringPointer = false;
		pointers.clear();
		unpinWindowDrag();
		apply();
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		e.stopPropagation();

		let delta = -e.deltaY;
		if (e.deltaMode === 1) delta *= 16;
		else if (e.deltaMode === 2) delta *= 40;

		const factor = Math.exp(delta * 0.00175);
		zoomAt(e.clientX, e.clientY, scale * factor);
	}

	function pointerCount() {
		return pointers.size;
	}

	function pinchDistance(): number {
		const pts = [...pointers.values()];
		if (pts.length < 2) return 0;
		return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
	}

	function pinchCenter(): Point {
		const pts = [...pointers.values()];
		return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
	}

	function unpinWindowDrag() {
		window.removeEventListener('pointermove', onWindowPointerMove);
		window.removeEventListener('pointerup', onWindowPointerUp);
		window.removeEventListener('pointercancel', onWindowPointerUp);
	}

	function pinWindowDrag() {
		unpinWindowDrag();
		window.addEventListener('pointermove', onWindowPointerMove);
		window.addEventListener('pointerup', onWindowPointerUp);
		window.addEventListener('pointercancel', onWindowPointerUp);
	}

	function onWindowPointerMove(e: PointerEvent) {
		if (activePointerId != null && e.pointerId !== activePointerId) return;
		if (!pointerDownAt && !dragOrigin) return;

		const origin = dragOrigin ?? pointerDownAt!;
		const dx = e.clientX - origin.x;
		const dy = e.clientY - origin.y;
		if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) movedDuringPointer = true;

		if (!dragging || !dragOrigin) return;

		e.preventDefault();
		tx = panAtDragStart.x + dx;
		ty = panAtDragStart.y + dy;
		clampPan();
		apply();
	}

	function onWindowPointerUp(e: PointerEvent) {
		if (activePointerId != null && e.pointerId !== activePointerId) return;

		const wasClick = !movedDuringPointer && pointerDownAt != null;
		const clickX = pointerDownAt?.x ?? e.clientX;
		const clickY = pointerDownAt?.y ?? e.clientY;

		dragging = false;
		dragOrigin = null;
		activePointerId = null;
		unpinWindowDrag();
		pointers.delete(e.pointerId);

		// Click while showing zoom-in cursor → zoom in toward click.
		if (wasClick && scale <= 1.001) {
			zoomAt(clickX, clickY, Math.min(maxScale, clickZoomScale));
		} else {
			apply();
		}

		pointerDownAt = null;
		movedDuringPointer = false;
	}

	function onPointerDown(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		e.stopPropagation();

		try {
			node.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}

		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		movedDuringPointer = false;
		pointerDownAt = { x: e.clientX, y: e.clientY };

		if (pointerCount() === 2) {
			dragging = false;
			dragOrigin = null;
			activePointerId = null;
			unpinWindowDrag();
			pinchStartDist = pinchDistance();
			pinchStartScale = scale;
			return;
		}

		// Start a potential pan (or click-to-zoom if never moved).
		activePointerId = e.pointerId;
		if (scale > 1.001) {
			dragging = true;
			dragOrigin = { x: e.clientX, y: e.clientY };
			panAtDragStart = { x: tx, y: ty };
			pinWindowDrag();
			apply();
		} else {
			// Still track pointer on window so a click (no move) can zoom in.
			dragging = false;
			dragOrigin = { x: e.clientX, y: e.clientY };
			panAtDragStart = { x: tx, y: ty };
			pinWindowDrag();
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (pointerCount() === 2 && pinchStartDist > 0) {
			e.preventDefault();
			e.stopPropagation();
			movedDuringPointer = true;
			const dist = pinchDistance();
			const center = pinchCenter();
			zoomAt(center.x, center.y, pinchStartScale * (dist / pinchStartDist));
		}
		// Single-pointer pan is handled on window while captured via pinWindowDrag.
	}

	function onPointerUp(e: PointerEvent) {
		pointers.delete(e.pointerId);
		if (pointerCount() < 2) pinchStartDist = 0;

		// Window handler owns click/pan end when it was the active pointer.
		if (e.pointerId === activePointerId) return;

		if (pointerCount() === 1 && scale > 1.001) {
			const remainingId = [...pointers.keys()][0];
			const remaining = pointers.get(remainingId)!;
			activePointerId = remainingId;
			dragging = true;
			dragOrigin = { x: remaining.x, y: remaining.y };
			panAtDragStart = { x: tx, y: ty };
			pinWindowDrag();
		}
	}

	function onDblClick(e: MouseEvent) {
		// Single-click already zooms in; dblclick toggles reset when zoomed.
		e.preventDefault();
		e.stopPropagation();
		if (scale > 1.05) reset();
	}

	function onTouchStart(e: TouchEvent) {
		if (scale > 1 || e.touches.length > 1) e.stopPropagation();
	}

	function onTouchMove(e: TouchEvent) {
		if (scale > 1 || e.touches.length > 1) {
			e.stopPropagation();
			if (e.cancelable) e.preventDefault();
		}
	}

	function onTouchEnd(e: TouchEvent) {
		if (scale > 1 || movedDuringPointer) e.stopPropagation();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key !== 'Escape' || scale <= 1.001) return;
		e.preventDefault();
		e.stopImmediatePropagation();
		reset();
	}

	node.style.touchAction = 'none';
	node.style.userSelect = 'none';
	;(node.style as CSSStyleDeclaration & { webkitUserDrag?: string }).webkitUserDrag = 'none';
	bindHandle();
	apply();

	node.addEventListener('wheel', onWheel, { passive: false });
	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointermove', onPointerMove);
	node.addEventListener('pointerup', onPointerUp);
	node.addEventListener('pointercancel', onPointerUp);
	node.addEventListener('dblclick', onDblClick);
	node.addEventListener('touchstart', onTouchStart, { passive: true });
	node.addEventListener('touchmove', onTouchMove, { passive: false });
	node.addEventListener('touchend', onTouchEnd, { passive: true });
	window.addEventListener('keydown', onKeyDown, true);

	return {
		update(next: ImageZoomPanOptions = {}) {
			minScale = next.minScale ?? 1;
			maxScale = next.maxScale ?? 5;
			clickZoomScale = next.clickZoomScale ?? 2.5;
			onZoomChange = next.onZoomChange;
			onTransform = next.onTransform;
			const nextApplyCss = next.applyCssTransform ?? true;
			const cssModeChanged = nextApplyCss !== applyCssTransform;
			applyCssTransform = nextApplyCss;
			handle = next.handle;
			bindHandle();
			if (scale < minScale || scale > maxScale) {
				scale = Math.min(maxScale, Math.max(minScale, scale));
				clampPan();
				apply();
			} else if (cssModeChanged) {
				apply();
			}
		},
		destroy() {
			unpinWindowDrag();
			node.removeEventListener('wheel', onWheel);
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointermove', onPointerMove);
			node.removeEventListener('pointerup', onPointerUp);
			node.removeEventListener('pointercancel', onPointerUp);
			node.removeEventListener('dblclick', onDblClick);
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('touchmove', onTouchMove);
			node.removeEventListener('touchend', onTouchEnd);
			window.removeEventListener('keydown', onKeyDown, true);
			node.style.transform = '';
			node.style.transformOrigin = '';
			node.style.willChange = '';
			node.style.cursor = '';
			node.style.touchAction = '';
			node.style.userSelect = '';
			node.classList.remove('is-zoomed');
			if (handle) {
				handle.reset = () => {};
				handle.isZoomed = () => false;
			}
		}
	};
}
