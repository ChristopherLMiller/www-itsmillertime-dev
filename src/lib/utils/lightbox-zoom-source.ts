const FALLBACK_MAX_LONG_EDGE = 4096;

/** Probe WebGL MAX_TEXTURE_SIZE; fall back to a conventional mobile heuristic. */
export function getMaxTextureSize(): number {
	if (typeof document === 'undefined') return FALLBACK_MAX_LONG_EDGE;
	try {
		const canvas = document.createElement('canvas');
		const gl =
			(canvas.getContext('webgl') as WebGLRenderingContext | null) ||
			(canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
		if (!gl) return FALLBACK_MAX_LONG_EDGE;
		const size = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return typeof size === 'number' && size > 0 ? size : FALLBACK_MAX_LONG_EDGE;
	} catch {
		return FALLBACK_MAX_LONG_EDGE;
	}
}

function resizeOptionsForLongEdge(
	width: number,
	height: number,
	maxLongEdge: number
): ImageBitmapOptions | undefined {
	const longEdge = Math.max(width, height);
	if (longEdge <= maxLongEdge) return undefined;
	const scale = maxLongEdge / longEdge;
	return {
		resizeWidth: Math.max(1, Math.round(width * scale)),
		resizeHeight: Math.max(1, Math.round(height * scale)),
		resizeQuality: 'high'
	};
}

async function createBitmapFromBlobCapped(blob: Blob, maxLongEdge: number): Promise<ImageBitmap> {
	const bitmap = await createImageBitmap(blob);
	const opts = resizeOptionsForLongEdge(bitmap.width, bitmap.height, maxLongEdge);
	if (!opts) return bitmap;
	try {
		const resized = await createImageBitmap(bitmap, opts);
		bitmap.close();
		return resized;
	} catch {
		bitmap.close();
		// Some engines want resize options on the blob decode directly.
		return createImageBitmap(blob, opts);
	}
}

/**
 * Decode a zoom source ImageBitmap from a URL (fetch → blob).
 * On failure, optionally fall back to an already-loaded HTMLImageElement.
 * If full-res decode throws, retries once capped to device max texture size.
 */
export async function loadZoomBitmap(
	src: string,
	fallbackImg?: HTMLImageElement | null
): Promise<ImageBitmap> {
	const maxLongEdge = getMaxTextureSize();

	const tryFromImg = async (): Promise<ImageBitmap | null> => {
		if (!fallbackImg || !fallbackImg.naturalWidth) return null;
		try {
			return await createImageBitmap(fallbackImg);
		} catch {
			try {
				const opts = resizeOptionsForLongEdge(
					fallbackImg.naturalWidth,
					fallbackImg.naturalHeight,
					maxLongEdge
				);
				return opts ? await createImageBitmap(fallbackImg, opts) : null;
			} catch {
				return null;
			}
		}
	};

	try {
		const res = await fetch(src, { mode: 'cors', credentials: 'same-origin' });
		if (!res.ok) throw new Error(`zoom bitmap fetch failed: ${res.status}`);
		const blob = await res.blob();
		try {
			return await createImageBitmap(blob);
		} catch {
			return await createBitmapFromBlobCapped(blob, maxLongEdge);
		}
	} catch {
		const fromImg = await tryFromImg();
		if (fromImg) return fromImg;
		throw new Error('Unable to decode zoom ImageBitmap');
	}
}

export function disposeZoomBitmap(bitmap: ImageBitmap | null | undefined) {
	if (!bitmap) return;
	try {
		bitmap.close();
	} catch {
		/* already closed */
	}
}
