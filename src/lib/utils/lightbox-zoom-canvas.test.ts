import { describe, expect, it, vi } from 'vitest';
import { containRect, paintLightboxZoomCanvas } from './lightbox-zoom-canvas';

describe('containRect', () => {
	it('letterboxes horizontally when the box is wider than the image', () => {
		// 2:1 box, 1:1 image → image height-fills, x inset
		const r = containRect(400, 200, 1000, 1000);
		expect(r.h).toBe(200);
		expect(r.w).toBe(200);
		expect(r.x).toBe(100);
		expect(r.y).toBe(0);
	});

	it('letterboxes vertically when the box is taller than the image', () => {
		const r = containRect(200, 400, 1000, 1000);
		expect(r.w).toBe(200);
		expect(r.h).toBe(200);
		expect(r.x).toBe(0);
		expect(r.y).toBe(100);
	});
});

describe('paintLightboxZoomCanvas', () => {
	it('draws the visible crop when zoomed', () => {
		const drawImage = vi.fn();
		const clearRect = vi.fn();
		const setTransform = vi.fn();
		const ctx = {
			drawImage,
			clearRect,
			setTransform,
			imageSmoothingEnabled: false,
			imageSmoothingQuality: 'low'
		};

		const canvas = {
			width: 0,
			height: 0,
			getContext: () => ctx
		} as unknown as HTMLCanvasElement;

		const pane = { clientWidth: 400, clientHeight: 800 } as HTMLElement;
		const frame = { offsetWidth: 400, offsetHeight: 600 } as HTMLElement;
		const bitmap = { width: 4000, height: 6000 } as ImageBitmap;

		vi.stubGlobal('window', { devicePixelRatio: 2 });

		paintLightboxZoomCanvas({
			canvas,
			pane,
			frame,
			bitmap,
			transform: { scale: 2, tx: 0, ty: 0 }
		});

		expect(canvas.width).toBe(800);
		expect(canvas.height).toBe(1600);
		expect(setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
		expect(clearRect).toHaveBeenCalled();
		expect(drawImage).toHaveBeenCalled();
		const args = drawImage.mock.calls[0];
		expect(args[0]).toBe(bitmap);
		expect(args[3]).toBeGreaterThan(0);
		expect(args[4]).toBeGreaterThan(0);
		expect(args[3]).toBeLessThanOrEqual(bitmap.width);
		expect(args[4]).toBeLessThanOrEqual(bitmap.height);

		vi.unstubAllGlobals();
	});

	it('does not stretch when the frame is wider than the bitmap aspect', () => {
		const drawImage = vi.fn();
		const canvas = {
			width: 0,
			height: 0,
			getContext: () => ({
				drawImage,
				clearRect: vi.fn(),
				setTransform: vi.fn(),
				imageSmoothingEnabled: false,
				imageSmoothingQuality: 'low'
			})
		} as unknown as HTMLCanvasElement;

		vi.stubGlobal('window', { devicePixelRatio: 1 });

		// Distorted 2:1 frame with square bitmap — contain letterboxes; source/dest aspects must match.
		paintLightboxZoomCanvas({
			canvas,
			pane: { clientWidth: 800, clientHeight: 400 } as HTMLElement,
			frame: { offsetWidth: 800, offsetHeight: 400 } as HTMLElement,
			bitmap: { width: 2000, height: 2000 } as ImageBitmap,
			transform: { scale: 1.5, tx: 0, ty: 0 }
		});

		expect(drawImage).toHaveBeenCalled();
		const [, sx, sy, sw, sh, dx, dy, dw, dh] = drawImage.mock.calls[0];
		// Non-stretch: source crop aspect must match destination (contain), not map a square
		// bitmap into a 2:1 frame (which would yield sw/sh ≈ 1 with dw/dh ≈ 2).
		expect(sw / sh).toBeCloseTo(dw / dh, 5);
		expect(Math.abs(sw / sh - dw / dh)).toBeLessThan(0.01);
		void sx;
		void sy;
		void dx;
		void dy;

		vi.unstubAllGlobals();
	});

	it('skips drawing at identity scale', () => {
		const drawImage = vi.fn();
		const canvas = {
			width: 0,
			height: 0,
			getContext: () => ({
				drawImage,
				clearRect: vi.fn(),
				setTransform: vi.fn(),
				imageSmoothingEnabled: false,
				imageSmoothingQuality: 'low'
			})
		} as unknown as HTMLCanvasElement;

		paintLightboxZoomCanvas({
			canvas,
			pane: { clientWidth: 400, clientHeight: 800 } as HTMLElement,
			frame: { offsetWidth: 400, offsetHeight: 600 } as HTMLElement,
			bitmap: { width: 4000, height: 6000 } as ImageBitmap,
			transform: { scale: 1, tx: 0, ty: 0 }
		});

		expect(drawImage).not.toHaveBeenCalled();
	});
});
