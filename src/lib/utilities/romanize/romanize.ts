/** Maps values 1–999 using standard subtractive Roman notation. */
const SUBTRACTIVE_PAIRS: [number, string][] = [
	[900, 'CM'],
	[500, 'D'],
	[400, 'CD'],
	[100, 'C'],
	[90, 'XC'],
	[50, 'L'],
	[40, 'XL'],
	[10, 'X'],
	[9, 'IX'],
	[5, 'V'],
	[4, 'IV'],
	[1, 'I']
];

function toRomanRemainder(n: number): string {
	let x = n;
	let result = '';
	for (const [value, numeral] of SUBTRACTIVE_PAIRS) {
		while (x >= value) {
			result += numeral;
			x -= value;
		}
	}
	return result;
}

/**
 * Returns a calendar year as Roman numerals (e.g. 2026 → `MMXXVI`).
 * Thousands are written as repeated `M` (e.g. 4000 → `MMMM`).
 */
export function romanize(year: number): string {
	if (!Number.isFinite(year) || year < 1) {
		throw new RangeError('romanize: year must be a positive finite number');
	}
	const y = Math.floor(year);
	if (y !== year) {
		throw new RangeError('romanize: year must be an integer');
	}
	const thousands = Math.floor(y / 1000);
	const remainder = y % 1000;
	return 'M'.repeat(thousands) + toRomanRemainder(remainder);
}
