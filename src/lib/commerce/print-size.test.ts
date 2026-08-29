import { describe, expect, it } from 'vitest';

import {
	formatPrintOfferLabel,
	extraPrintLabelParts,
	parsePrintSize,
	printCropCopy,
	printDpiCopy,
	printFitDetails,
	PRODIGI_RECOMMENDED_DPI
} from './print-size';

describe('formatPrintOfferLabel', () => {
	it('keeps size, unit, and paper weight without paper type codes', () => {
		expect(formatPrintOfferLabel('4×6″ · LPP · 240gsm')).toBe('4×6″ · 240gsm');
		expect(formatPrintOfferLabel('4×6″ · HPR · 308gsm')).toBe('4×6″ · 308gsm');
		expect(formatPrintOfferLabel('5×7" · LPP · 240gsm')).toBe('5×7″ · 240gsm');
		expect(formatPrintOfferLabel('30.5×38.1 cm · LPP · 240gsm')).toBe('30.5×38.1 cm · 240gsm');
	});

	it('adds an inch mark when the saved label has no unit', () => {
		expect(formatPrintOfferLabel('8x10')).toBe('8×10″');
		expect(formatPrintOfferLabel('11X14')).toBe('11×14″');
	});

	it('omits weight when gsm is missing', () => {
		expect(formatPrintOfferLabel('8×10″ · LPP')).toBe('8×10″');
	});
});

describe('extraPrintLabelParts', () => {
	it('keeps paper names and codes, not size or weight', () => {
		expect(extraPrintLabelParts('4×6″ · Archival Professional · 240gsm')).toEqual([
			'Archival Professional'
		]);
		expect(extraPrintLabelParts('4×6″ · Archival Professional')).toEqual(['Archival Professional']);
		expect(extraPrintLabelParts('4×6″ · LPP · 240gsm')).toEqual(['LPP']);
		expect(extraPrintLabelParts('4×6″ · HPR · 308gsm')).toEqual(['HPR']);
	});
});

describe('parsePrintSize', () => {
	it('reads inches, centimetres, and gsm', () => {
		expect(parsePrintSize('4×6″ · LPP · 240gsm')).toMatchObject({
			width: 4,
			height: 6,
			unit: 'in',
			gsm: 240
		});
		expect(parsePrintSize('30.5×38.1 cm · LPP · 240gsm')).toMatchObject({
			width: 30.5,
			height: 38.1,
			unit: 'cm',
			gsm: 240
		});
	});
});

describe('printFitDetails', () => {
	const landscape3x2 = { w: 5184, h: 3456 };

	it('treats 4×6 as a match with no crop on a 3:2 photo', () => {
		const details = printFitDetails('4×6″ · 240gsm', landscape3x2.w, landscape3x2.h);
		expect(details?.fit).toBe('match');
		expect(details?.crop.axis).toBe('none');
		expect(details?.lowResolution).toBe(false);
		expect(details?.dpi.dpi).toBeGreaterThan(PRODIGI_RECOMMENDED_DPI);
		expect(printCropCopy(details!)).toContain('nothing will be cropped');
	});

	it('crops the sides for 5×7 and 8×10 on a 3:2 photo', () => {
		const fiveSeven = printFitDetails('5×7″ · 240gsm', landscape3x2.w, landscape3x2.h);
		expect(fiveSeven?.fit).toBe('crop');
		expect(fiveSeven?.crop.axis).toBe('horizontal');
		expect(fiveSeven?.crop.cropPercent).toBeCloseTo((1 - 1.4 / 1.5) * 100, 5);
		expect(printCropCopy(fiveSeven!)).toMatch(/left and right/);

		const eightTen = printFitDetails('8×10″ · 240gsm', landscape3x2.w, landscape3x2.h);
		expect(eightTen?.fit).toBe('crop');
		expect(eightTen?.crop.axis).toBe('horizontal');
		expect(eightTen?.crop.visibleWidth).toBeCloseTo(1.25 / 1.5, 5);
	});

	it('flags large prints below Prodigi’s 300 dpi recommendation', () => {
		const details = printFitDetails('16×20″ · 240gsm', landscape3x2.w, landscape3x2.h);
		expect(details?.fit).toBe('crop');
		expect(details?.dpi.dpi).toBeCloseTo(216, 0);
		expect(details?.lowResolution).toBe(true);
		expect(printDpiCopy(details!)).toMatch(/below Prodigi's 300 dpi/);
	});

	it('returns null without image dimensions', () => {
		expect(printFitDetails('8×10″', null, null)).toBeNull();
	});
});
