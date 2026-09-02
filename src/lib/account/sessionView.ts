import type { AuthSessionView } from './types';

export type { AuthSessionView };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

export function parseAuthSession(raw: unknown): AuthSessionView | null {
	if (!isRecord(raw)) return null;
	const createdAt =
		raw.createdAt instanceof Date || typeof raw.createdAt === 'string' ? raw.createdAt : null;
	const expiresAt =
		raw.expiresAt instanceof Date || typeof raw.expiresAt === 'string' ? raw.expiresAt : null;

	return {
		id: readString(raw.id),
		token: readString(raw.token),
		createdAt,
		expiresAt,
		ipAddress: readString(raw.ipAddress),
		userAgent: readString(raw.userAgent)
	};
}

export function sessionIdentity(session: AuthSessionView | null | undefined): string | null {
	if (!session) return null;
	return session.token ?? session.id;
}
