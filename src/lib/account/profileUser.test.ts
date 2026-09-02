import { describe, expect, it } from 'vitest';
import {
	extractProfileAlbums,
	mergeProfileUser,
	normalizeRoles,
	parseNsfwFiltering,
	parseProfileUser
} from './profileUser';

describe('normalizeRoles', () => {
	it('keeps Payload role arrays', () => {
		expect(normalizeRoles(['admin', 'user'])).toEqual(['admin', 'user']);
	});

	it('wraps a Better Auth string role', () => {
		expect(normalizeRoles('admin')).toEqual(['admin']);
	});

	it('drops empty values', () => {
		expect(normalizeRoles(['', 'family'])).toEqual(['family']);
		expect(normalizeRoles(null)).toEqual([]);
	});
});

describe('parseProfileUser', () => {
	it('reads Payload fields and albums', () => {
		const user = parseProfileUser({
			id: 12,
			email: 'chris@example.com',
			name: 'Chris Miller',
			displayName: 'Chris',
			nsfwFiltering: 'blur',
			bggUsername: 'moose517',
			role: ['admin', 'user'],
			emailVerified: true,
			twoFactorEnabled: false,
			createdAt: '2020-01-02T00:00:00.000Z',
			albums: {
				docs: [{ id: 3, title: 'Family', slug: 'family' }, { id: 4 }]
			}
		});

		expect(user).toMatchObject({
			id: 12,
			displayName: 'Chris',
			nsfwFiltering: 'blur',
			bggUsername: 'moose517',
			role: ['admin', 'user']
		});
		expect(user?.albums).toEqual([{ id: 3, title: 'Family', slug: 'family' }]);
	});

	it('returns undefined without an id', () => {
		expect(parseProfileUser({ email: 'a@b.c' })).toBeUndefined();
	});
});

describe('mergeProfileUser', () => {
	it('keeps Payload snapshot fields when the client session omits them', () => {
		const snapshot = parseProfileUser({
			id: 1,
			displayName: 'Chris',
			nsfwFiltering: 'hide',
			role: ['family'],
			createdAt: '2020-01-02T00:00:00.000Z'
		});
		const merged = mergeProfileUser({ id: 1, name: 'Christopher', email: 'a@b.c' }, snapshot);

		expect(merged?.displayName).toBe('Chris');
		expect(merged?.nsfwFiltering).toBe('hide');
		expect(merged?.role).toEqual(['family']);
		expect(merged?.createdAt).toBe('2020-01-02T00:00:00.000Z');
		expect(merged?.name).toBe('Christopher');
	});
});

describe('parseNsfwFiltering', () => {
	it('accepts only hide, blur, or show', () => {
		expect(parseNsfwFiltering('blur')).toBe('blur');
		expect(parseNsfwFiltering('nope')).toBeNull();
	});
});

describe('extractProfileAlbums', () => {
	it('reads a populated docs list', () => {
		expect(
			extractProfileAlbums([
				{ id: 1, title: 'A', slug: 'a' },
				{ id: 2, title: 'B' }
			])
		).toEqual([{ id: 1, title: 'A', slug: 'a' }]);
	});
});
