import { describe, expect, it } from 'vitest';
import { allowedUserMatches, albumCoverMedia, describeContentAlbum } from './contentAlbums';

describe('describeContentAlbum', () => {
	it('prefers an explicit share over a role match', () => {
		expect(
			describeContentAlbum({
				assigned: true,
				allowed: false,
				matchingRoles: ['family']
			})
		).toEqual({ group: 'shared', via: 'Shared' });
	});

	it('labels role access with the matching group', () => {
		expect(
			describeContentAlbum({
				assigned: false,
				allowed: false,
				matchingRoles: ['family', 'user']
			})
		).toEqual({ group: 'role', via: 'Family' });
	});
});

describe('allowedUserMatches', () => {
	it('matches ids and populated user objects', () => {
		expect(allowedUserMatches([3, 8], 8)).toBe(true);
		expect(allowedUserMatches([{ id: 4 }], 4)).toBe(true);
		expect(allowedUserMatches([1], 4)).toBe(false);
	});
});

describe('albumCoverMedia', () => {
	it('accepts a populated cover with a url', () => {
		expect(albumCoverMedia({ id: 9, url: '/img.jpg' })?.id).toBe(9);
	});

	it('rejects ids without media bytes', () => {
		expect(albumCoverMedia(9)).toBeNull();
		expect(albumCoverMedia({ id: 9 })).toBeNull();
	});
});
