import { describe, expect, it } from 'vitest';
import { parseAuthSession, sessionIdentity } from './sessionView';

describe('parseAuthSession', () => {
	it('reads the current device session', () => {
		const session = parseAuthSession({
			id: 'sess_1',
			token: 'tok_1',
			createdAt: '2026-01-01T12:00:00.000Z',
			ipAddress: '1.1.1.1',
			userAgent: 'Mozilla'
		});
		expect(sessionIdentity(session)).toBe('tok_1');
		expect(session?.ipAddress).toBe('1.1.1.1');
	});

	it('returns null for missing session objects', () => {
		expect(parseAuthSession(undefined)).toBeNull();
	});
});
