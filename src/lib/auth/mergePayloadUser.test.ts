import { describe, expect, it } from 'vitest';
import {
	extractPayloadMeUser,
	mergeSessionUser,
	sessionFromAuthResponses
} from './mergePayloadUser';

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
				{ id: 1, name: 'A', email: 'a@b.c', role: 'user' },
				{ id: 1, displayName: 'Display', nsfwFiltering: 'hide', role: ['admin'] }
			)
		).toEqual({
			id: 1,
			name: 'A',
			email: 'a@b.c',
			displayName: 'Display',
			nsfwFiltering: 'hide',
			role: ['admin']
		});
	});

	it('overlays Payload /users/me onto get-session', async () => {
		const sessionRes = new Response(
			JSON.stringify({ user: { id: 1, email: 'a@b.c', role: 'user' } })
		);
		const meRes = new Response(JSON.stringify({ user: { id: 1, role: ['admin'] } }));
		const session = await sessionFromAuthResponses(sessionRes, meRes);
		expect(session?.user?.role).toEqual(['admin']);
	});

	it('retries /users/me when the first response is not ok', async () => {
		const sessionRes = new Response(JSON.stringify({ user: { id: 1, role: 'user' } }));
		const failedMe = new Response(null, { status: 401 });
		const session = await sessionFromAuthResponses(sessionRes, failedMe, async () => {
			return new Response(JSON.stringify({ user: { id: 1, role: ['admin'] } }));
		});
		expect(session?.user?.role).toEqual(['admin']);
	});

	it('returns null when get-session fails', async () => {
		expect(await sessionFromAuthResponses(new Response(null, { status: 500 }), null)).toBeNull();
	});
});
