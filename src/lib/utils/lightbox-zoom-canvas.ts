import type { ImageZoomPanTransform } from '$lib/utils/image-zoom-pan';

export type LightboxZoomCanvasPaintInput = {
	canvas: HTMLCanvasElement;
	pane: HTMLElement;
	frame: HTMLElement;
	bitmap: ImageBitmap;
	transform: ImageZoomPanTransform;
};

/** object-fit: contain rect of an image inside a box (CSS pixels). */
export function containRect(
	boxW: number,
	boxH: number,
	imgW: number,
	imgH: number
): { x: number; y: number; w: number; h: number } {
	if (boxW <= 0 || boxH <= 0 || imgW <= 0 || imgH <= 0) {
		return { x: 0, y: 0, w: boxW, h: boxH };
	}
	const boxAr = boxW / boxH;
	const imgAr = imgW / imgH;
	if (imgAr > boxAr) {
		const w = boxW;
		const h = boxW / imgAr;
		return { x: 0, y: (boxH - h) / 2, w, h };
	}
	const h = boxH;
	const w = boxH * imgAr;
	return { x: (boxW - w) / 2, y: 0, w, h };
}

/**
 * Paint the visible crop of `bitmap` into a pane-sized canvas, matching
 * center-origin translate+scale used by imageZoomPan on the aspect-ratio frame,
 * with object-fit:contain of the bitmap inside that frame (same as the <img>).
 */
export function paintLightboxZoomCanvas(input: LightboxZoomCanvasPaintInput): void {
	const { canvas, pane, frame, bitmap, transform } = input;
	const { scale, tx, ty } = transform;

	const paneW = pane.clientWidth;
	const paneH = pane.clientHeight;
	if (paneW <= 0 || paneH <= 0) return;

	const frameW = frame.offsetWidth;
	const frameH = frame.offsetHeight;
	if (frameW <= 0 || frameH <= 0) return;

	const dpr = Math.max(
		1,
		(typeof window !== 'undefined' ? window.devicePixelRatio : undefined) || 1
	);
	const bufW = Math.max(1, Math.round(paneW * dpr));
	const bufH = Math.max(1, Math.round(paneH * dpr));
	if (canvas.width !== bufW || canvas.height !== bufH) {
		canvas.width = bufW;
		canvas.height = bufH;
	}

	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, paneW, paneH);

	if (scale <= 1.001) return;

	// Image content box inside the frame (object-fit: contain), then CSS transform.
	const fitted = containRect(frameW, frameH, bitmap.width, bitmap.height);
	const destX = paneW / 2 - (frameW / 2) * scale + tx + fitted.x * scale;
	const destY = paneH / 2 - (frameH / 2) * scale + ty + fitted.y * scale;
	const destW = fitted.w * scale;
	const destH = fitted.h * scale;

	const visibleLeft = Math.max(0, destX);
	const visibleTop = Math.max(0, destY);
	const visibleRight = Math.min(paneW, destX + destW);
	const visibleBottom = Math.min(paneH, destY + destH);
	if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return;

	const sx = ((visibleLeft - destX) / destW) * bitmap.width;
	const sy = ((visibleTop - destY) / destH) * bitmap.height;
	const sw = ((visibleRight - visibleLeft) / destW) * bitmap.width;
	const sh = ((visibleBottom - visibleTop) / destH) * bitmap.height;
	if (sw <= 0 || sh <= 0) return;

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(
		bitmap,
		sx,
		sy,
		sw,
		sh,
		visibleLeft,
		visibleTop,
		visibleRight - visibleLeft,
		visibleBottom - visibleTop
	);
}

export type LightboxZoomCanvasController = {
	schedule: () => void;
	destroy: () => void;
};

/** Coalesce paints to at most one drawImage per animation frame. */
export function createLightboxZoomCanvasController(
	getInput: () => LightboxZoomCanvasPaintInput | null
): LightboxZoomCanvasController {
	let raf = 0;

	const schedule = () => {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			const input = getInput();
			if (!input) return;
			paintLightboxZoomCanvas(input);
		});
	};

	const destroy = () => {
		if (raf) {
			cancelAnimationFrame(raf);
			raf = 0;
		}
	};

	return { schedule, destroy };
}
