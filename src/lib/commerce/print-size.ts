/** Prodigi recommends 300 dpi for photo / fine-art prints. */
export const PRODIGI_RECOMMENDED_DPI = 300;

const SIZE_PATTERN = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i;
const SIZE_WITH_UNIT = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(″|"|''|in(?:ch(?:es)?)?|cm)?/i;
const GSM_PATTERN = /(\d+)\s*gsm/i;

/** Near-exact print (e.g. 4×6 on a 3:2 photo). */
const MATCH_TOLERANCE = 0.03;
/** Close enough to suggest, but the print will crop (e.g. 5×7, 8×10 on 3:2). */
const CROP_SUGGEST_TOLERANCE = 0.22;

export type PrintAspectFit = 'match' | 'crop' | 'far';
export type PrintUnit = 'in' | 'cm';
export type PrintCropAxis = 'horizontal' | 'vertical' | 'none';

export type ParsedPrintSize = {
	width: number;
	height: number;
	widthLabel: string;
	heightLabel: string;
	unit: PrintUnit;
	gsm: number | null;
};

export type PrintCropPreview = {
	visibleWidth: number;
	visibleHeight: number;
	offsetX: number;
	offsetY: number;
	axis: PrintCropAxis;
	/** Percent of photo area discarded (0–100). */
	cropPercent: number;
};

export type PrintDpiCheck = {
	dpi: number;
	recommendedDpi: number;
	meetsRecommended: boolean;
};

export type PrintFitDetails = {
	fit: PrintAspectFit;
	crop: PrintCropPreview;
	dpi: PrintDpiCheck;
	lowResolution: boolean;
};

export function parsePrintSize(label: string): ParsedPrintSize | null {
	const match = label.match(SIZE_WITH_UNIT);
	if (!match) return null;
	const widthLabel = match[1];
	const heightLabel = match[2];
	if (!widthLabel || !heightLabel) return null;
	const width = Number(widthLabel);
	const height = Number(heightLabel);
	if (!(width > 0) || !(height > 0)) return null;

	const unitToken = match[3]?.toLowerCase() ?? '';
	let unit: PrintUnit = 'in';
	if (unitToken === 'cm') {
		unit = 'cm';
	} else if (
		unitToken === '″' ||
		unitToken === '"' ||
		unitToken === "''" ||
		unitToken.startsWith('in')
	) {
		unit = 'in';
	} else if (/\bcm\b/i.test(label)) {
		unit = 'cm';
	}

	const gsmMatch = label.match(GSM_PATTERN);
	const gsm = gsmMatch ? Number(gsmMatch[1]) : null;

	return {
		width,
		height,
		widthLabel,
		heightLabel,
		unit,
		gsm: gsm != null && gsm > 0 ? gsm : null
	};
}

function normalizeMultiply(value: string): string {
	return value
		.replace(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/g, '$1×$2')
		.replace(/\s+/g, ' ')
		.trim();
}

function isSizeOrWeightToken(token: string): boolean {
	return SIZE_PATTERN.test(token) || GSM_PATTERN.test(token);
}

/** Paper names and codes from a label (e.g. "Archival Professional", "LPP"), not size or gsm. */
export function extraPrintLabelParts(value: string): string[] {
	const parts: string[] = [];
	const seen = new Set<string>();
	for (const raw of value.split(/\s*[·•|]\s*/)) {
		const token = raw.trim();
		if (!token || isSizeOrWeightToken(token)) continue;
		const key = token.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		parts.push(token);
	}
	return parts;
}

/** Size and paper weight for the shop size row — not Prodigi codes or paper names. */
export function formatPrintOfferLabel(value: string | null | undefined): string {
	const raw = (value ?? '').trim();
	if (!raw) return 'Print';
	const parsed = parsePrintSize(raw);
	if (!parsed) {
		const extras = extraPrintLabelParts(raw);
		return normalizeMultiply(extras.join(' · ')) || 'Print';
	}
	const unit = parsed.unit === 'cm' ? ' cm' : '″';
	const size = `${parsed.widthLabel}×${parsed.heightLabel}${unit}`;
	return parsed.gsm != null ? `${size} · ${parsed.gsm}gsm` : size;
}

/** Larger/smaller so 4×6 and 6×4 compare the same. */
export function printSizeAspectRatio(label: string): number | null {
	const match = label.match(SIZE_PATTERN);
	if (!match) return null;
	const a = Number(match[1]);
	const b = Number(match[2]);
	if (!(a > 0) || !(b > 0)) return null;
	return Math.max(a, b) / Math.min(a, b);
}

export function imageAspectRatioNormalized(
	width: number | null | undefined,
	height: number | null | undefined
): number | null {
	if (typeof width !== 'number' || typeof height !== 'number') return null;
	if (!(width > 0) || !(height > 0)) return null;
	return Math.max(width, height) / Math.min(width, height);
}

/**
 * How a print size relates to the photo. Unknown labels or missing image
 * dimensions count as a match so we do not mark them.
 */
export function printSizeAspectFit(
	label: string,
	imageWidth?: number | null,
	imageHeight?: number | null
): PrintAspectFit {
	const print = printSizeAspectRatio(label);
	const image = imageAspectRatioNormalized(imageWidth, imageHeight);
	if (print == null || image == null) return 'match';
	const rel = Math.abs(print - image) / image;
	if (rel <= MATCH_TOLERANCE) return 'match';
	if (rel <= CROP_SUGGEST_TOLERANCE) return 'crop';
	return 'far';
}

function orientPrint(
	width: number,
	height: number,
	imageWidth: number,
	imageHeight: number
): { width: number; height: number } {
	const imageLandscape = imageWidth >= imageHeight;
	const printLandscape = width >= height;
	if (imageLandscape === printLandscape) return { width, height };
	return { width: height, height: width };
}

function toInches(
	width: number,
	height: number,
	unit: PrintUnit
): { width: number; height: number } {
	if (unit === 'in') return { width, height };
	return { width: width / 2.54, height: height / 2.54 };
}

export function printCropPreview(
	parsed: ParsedPrintSize,
	imageWidth: number,
	imageHeight: number
): PrintCropPreview {
	const oriented = orientPrint(parsed.width, parsed.height, imageWidth, imageHeight);
	const imageAR = imageWidth / imageHeight;
	const printAR = oriented.width / oriented.height;

	if (!(imageAR > 0) || !(printAR > 0)) {
		return {
			visibleWidth: 1,
			visibleHeight: 1,
			offsetX: 0,
			offsetY: 0,
			axis: 'none',
			cropPercent: 0
		};
	}

	if (Math.abs(imageAR - printAR) / imageAR <= MATCH_TOLERANCE) {
		return {
			visibleWidth: 1,
			visibleHeight: 1,
			offsetX: 0,
			offsetY: 0,
			axis: 'none',
			cropPercent: 0
		};
	}

	if (imageAR > printAR) {
		const visibleWidth = printAR / imageAR;
		return {
			visibleWidth,
			visibleHeight: 1,
			offsetX: (1 - visibleWidth) / 2,
			offsetY: 0,
			axis: 'horizontal',
			cropPercent: (1 - visibleWidth) * 100
		};
	}

	const visibleHeight = imageAR / printAR;
	return {
		visibleWidth: 1,
		visibleHeight,
		offsetX: 0,
		offsetY: (1 - visibleHeight) / 2,
		axis: 'vertical',
		cropPercent: (1 - visibleHeight) * 100
	};
}

export function printDpiCheck(
	parsed: ParsedPrintSize,
	crop: PrintCropPreview,
	imageWidth: number,
	imageHeight: number
): PrintDpiCheck {
	const oriented = orientPrint(parsed.width, parsed.height, imageWidth, imageHeight);
	const inches = toInches(oriented.width, oriented.height, parsed.unit);
	const remainingW = imageWidth * crop.visibleWidth;
	const remainingH = imageHeight * crop.visibleHeight;
	const dpi = Math.min(remainingW / inches.width, remainingH / inches.height);
	return {
		dpi,
		recommendedDpi: PRODIGI_RECOMMENDED_DPI,
		meetsRecommended: dpi >= PRODIGI_RECOMMENDED_DPI
	};
}

export function printFitDetails(
	label: string,
	imageWidth?: number | null,
	imageHeight?: number | null
): PrintFitDetails | null {
	if (typeof imageWidth !== 'number' || typeof imageHeight !== 'number') return null;
	if (!(imageWidth > 0) || !(imageHeight > 0)) return null;
	const parsed = parsePrintSize(label);
	if (!parsed) return null;
	const crop = printCropPreview(parsed, imageWidth, imageHeight);
	const dpi = printDpiCheck(parsed, crop, imageWidth, imageHeight);
	return {
		fit: printSizeAspectFit(label, imageWidth, imageHeight),
		crop,
		dpi,
		lowResolution: !dpi.meetsRecommended
	};
}

export function printCropCopy(details: PrintFitDetails): string {
	if (details.crop.axis === 'none') {
		return 'This size matches the photo — nothing will be cropped.';
	}
	const pct = Math.max(1, Math.round(details.crop.cropPercent));
	if (details.crop.axis === 'horizontal') {
		return `About ${pct}% will be cropped from the left and right to fill this size.`;
	}
	return `About ${pct}% will be cropped from the top and bottom to fill this size.`;
}

export function printDpiCopy(details: PrintFitDetails): string {
	const dpi = Math.round(details.dpi.dpi);
	if (details.dpi.meetsRecommended) {
		return `Print resolution is about ${dpi} dpi. Prodigi recommends 300 dpi for photo prints.`;
	}
	return `Print resolution is about ${dpi} dpi — below Prodigi's 300 dpi recommendation. Fine detail may look soft.`;
}
