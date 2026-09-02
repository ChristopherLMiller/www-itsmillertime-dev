import { describe, expect, it } from 'vitest';
import { stabilizeSession } from './stabilizeSession';

describe('stabilizeSession', () => {
	it('keeps the previous session when a refetch returns null', () => {
		const previous = { user: { id: 1, role: ['admin'] } };
		expect(stabilizeSession(previous, null)).toBe(previous);
	});

	it('keeps admin role when a refetch drops Payload roles', () => {
		const previous = { user: { id: 1, role: ['admin'], displayName: 'Chris' } };
		const next = { user: { id: 1, role: 'user', email: 'a@b.c' } };
		expect(stabilizeSession(previous, next)?.user?.role).toEqual(['admin']);
		expect(stabilizeSession(previous, next)?.user?.email).toBe('a@b.c');
	});

	it('lets a saved NSFW preference win over the cached session', () => {
		const previous = { user: { id: 1, nsfwFiltering: 'hide', role: ['user'] } };
		const next = { user: { id: 1, nsfwFiltering: 'show', role: ['user'] } };
		expect(stabilizeSession(previous, next)?.user?.nsfwFiltering).toBe('show');
	});

	it('accepts a fresh login when there was no previous session', () => {
		const next = { user: { id: 2, role: ['user'] } };
		expect(stabilizeSession(null, next)).toBe(next);
	});
});
