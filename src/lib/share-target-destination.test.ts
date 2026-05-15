import { describe, expect, it } from 'vitest';
import {
	encodeShareTargetDestination,
	parseShareTargetDestination,
	type ShareTargetDestination
} from './share-target-destination';

describe('parseShareTargetDestination', () => {
	it('defaults to media', () => {
		expect(parseShareTargetDestination(undefined)).toEqual({ mode: 'media' });
		expect(parseShareTargetDestination('')).toEqual({ mode: 'media' });
		expect(parseShareTargetDestination('media')).toEqual({ mode: 'media' });
	});

	it('parses gallery-image cookie', () => {
		expect(parseShareTargetDestination('gallery-image')).toEqual({ mode: 'gallery-image' });
	});

	it('maps legacy gallery:<id> cookies to gallery-image', () => {
		expect(parseShareTargetDestination('gallery:42')).toEqual({ mode: 'gallery-image' });
	});

	it('falls back for invalid legacy gallery cookie', () => {
		expect(parseShareTargetDestination('gallery:')).toEqual({ mode: 'media' });
		expect(parseShareTargetDestination('gallery:abc')).toEqual({ mode: 'media' });
	});
});

describe('encodeShareTargetDestination', () => {
	it('round-trips', () => {
		const cases: ShareTargetDestination[] = [{ mode: 'media' }, { mode: 'gallery-image' }];
		for (const c of cases) {
			expect(parseShareTargetDestination(encodeShareTargetDestination(c))).toEqual(c);
		}
	});
});
