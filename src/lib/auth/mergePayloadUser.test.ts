import { describe, expect, it } from 'vitest';
import { extractPayloadMeUser, mergeSessionUser } from './mergePayloadUser';

describe('mergePayloadUser', () => {
	it('extracts nested user', () => {
		expect(extractPayloadMeUser({ user: { id: 1, displayName: 'Chris' } })).toEqual({
			id: 1,
			displayName: 'Chris'
		});
	});

	it('extracts top-level user document', () => {
		expect(extractPayloadMeUser({ id: 2, email: 'a@b.c', nsfwFiltering: 'blur' })).toEqual({
			id: 2,
			email: 'a@b.c',
			nsfwFiltering: 'blur'
		});
	});

	it('merges payload fields over session user', () => {
		expect(
			mergeSessionUser(
				{ id: 1, name: 'A', email: 'a@b.c' },
				{ id: 1, displayName: 'Display', nsfwFiltering: 'hide' }
			)
		).toEqual({
			id: 1,
			name: 'A',
			email: 'a@b.c',
			displayName: 'Display',
			nsfwFiltering: 'hide'
		});
	});
});
