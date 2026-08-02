import { describe, expect, it } from 'vitest';
import { canAccessGallerySettings, mediaRequiresAuthProxy } from './gallery-access';

describe('canAccessGallerySettings', () => {
	it('allows public albums for anonymous users', () => {
		expect(canAccessGallerySettings({ visibility: 'ALL', isNsfw: false }, null)).toBe(true);
	});

	it('blocks restricted albums for anonymous users', () => {
		expect(canAccessGallerySettings({ visibility: 'AUTHENTICATED', isNsfw: false }, null)).toBe(
			false
		);
	});

	it('blocks NSFW albums for anonymous users', () => {
		expect(canAccessGallerySettings({ visibility: 'ALL', isNsfw: true }, null)).toBe(false);
	});

	it('allows authenticated albums for logged-in users', () => {
		expect(
			canAccessGallerySettings(
				{ visibility: 'AUTHENTICATED', isNsfw: false },
				{ id: 1, role: ['user'] }
			)
		).toBe(true);
	});

	it('blocks privileged albums without matching role', () => {
		expect(
			canAccessGallerySettings(
				{ visibility: 'PRIVILEGED', permittedRoles: ['family'], isNsfw: false },
				{ id: 1, role: ['user'] }
			)
		).toBe(false);
	});

	it('allows admins for privileged albums', () => {
		expect(
			canAccessGallerySettings(
				{ visibility: 'PRIVILEGED', permittedRoles: ['family'], isNsfw: false },
				{ id: 1, role: ['admin'] }
			)
		).toBe(true);
	});
});

describe('mediaRequiresAuthProxy', () => {
	it('is false for public non-NSFW media', () => {
		expect(mediaRequiresAuthProxy({ visibility: 'ALL', isNsfw: false })).toBe(false);
	});

	it('is true for NSFW, authenticated, or privileged media', () => {
		expect(mediaRequiresAuthProxy({ visibility: 'ALL', isNsfw: true })).toBe(true);
		expect(mediaRequiresAuthProxy({ visibility: 'AUTHENTICATED', isNsfw: false })).toBe(true);
		expect(mediaRequiresAuthProxy({ visibility: 'PRIVILEGED', isNsfw: false })).toBe(true);
	});
});
