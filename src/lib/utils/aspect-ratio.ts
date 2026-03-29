/** Safe aspect ratio width/height for CSS `aspect-ratio` (falls back when invalid). */
export function cssAspectRatioFromDimensions(
	width: number | null | undefined,
	height: number | null | undefined,
	fallback: number
): number {
	const w = typeof width === 'number' && width > 0 ? width : 0;
	const h = typeof height === 'number' && height > 0 ? height : 0;
	if (w <= 0 || h <= 0) return fallback;
	return w / h;
}
