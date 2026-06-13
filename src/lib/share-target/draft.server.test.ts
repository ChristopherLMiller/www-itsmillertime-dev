import { describe, expect, it } from 'vitest';
import { isShareTargetDraftToken, readDraftMeta } from './draft.server';

describe('isShareTargetDraftToken', () => {
	it('rejects invalid input', () => {
		expect(isShareTargetDraftToken(undefined)).toBe(false);
		expect(isShareTargetDraftToken('')).toBe(false);
		expect(isShareTargetDraftToken('G'.repeat(32))).toBe(false); // uppercase
		expect(isShareTargetDraftToken('0'.repeat(31))).toBe(false); // wrong length
		expect(isShareTargetDraftToken(`${'f'.repeat(31)}z`)).toBe(false); // non-hex
	});

	it('accepts lowercase 128-bit hex tokens', () => {
		const t = 'a'.repeat(32);
		expect(isShareTargetDraftToken(t)).toBe(true);
	});
});

describe('readDraftMeta', () => {
	it('short-circuits on invalid tokens', async () => {
		await expect(readDraftMeta(undefined)).resolves.toBeNull();
		await expect(readDraftMeta('oops')).resolves.toBeNull();
	});
});
