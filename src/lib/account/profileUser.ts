import type { NsfwFiltering, ProfileAlbum, ProfileUserView } from './types';

export type { NsfwFiltering, ProfileAlbum, ProfileUserView };

const NSFW_VALUES = new Set<NsfwFiltering>(['hide', 'blur', 'show']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeRoles(role: unknown): string[] {
	if (Array.isArray(role)) {
		return role.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
	}
	if (typeof role === 'string' && role.trim()) return [role.trim()];
	return [];
}

export function parseNsfwFiltering(value: unknown): NsfwFiltering | null {
	return typeof value === 'string' && NSFW_VALUES.has(value as NsfwFiltering)
		? (value as NsfwFiltering)
		: null;
}

export function extractProfileAlbums(raw: unknown): ProfileAlbum[] {
	const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.docs) ? raw.docs : [];

	const albums: ProfileAlbum[] = [];
	for (const item of list) {
		if (!isRecord(item)) continue;
		const id = typeof item.id === 'number' ? item.id : Number(item.id);
		if (!Number.isFinite(id)) continue;
		const title = typeof item.title === 'string' ? item.title : null;
		const slug = typeof item.slug === 'string' ? item.slug : null;
		if (!title || !slug) continue;
		albums.push({ id, title, slug });
	}
	return albums;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value : null;
}

function readBoolean(value: unknown): boolean | null {
	return typeof value === 'boolean' ? value : null;
}

export function parseProfileUser(raw: unknown): ProfileUserView | undefined {
	if (!isRecord(raw) || raw.id == null) return undefined;
	const id = typeof raw.id === 'number' || typeof raw.id === 'string' ? raw.id : null;
	if (id == null || id === '') return undefined;

	return {
		id,
		email: readString(raw.email),
		name: readString(raw.name),
		displayName: readString(raw.displayName),
		nsfwFiltering: parseNsfwFiltering(raw.nsfwFiltering),
		bggUsername: readString(raw.bggUsername),
		image: readString(raw.image),
		role: normalizeRoles(raw.role),
		emailVerified: readBoolean(raw.emailVerified),
		twoFactorEnabled: readBoolean(raw.twoFactorEnabled),
		banned: readBoolean(raw.banned),
		createdAt: readString(raw.createdAt),
		albums: extractProfileAlbums(raw.albums)
	};
}

export function mergeProfileUser(
	sessionUser: unknown,
	snapshot?: ProfileUserView | null
): ProfileUserView | undefined {
	const fromSession = parseProfileUser(sessionUser);
	if (!fromSession && !snapshot) return undefined;
	if (!fromSession) return snapshot ?? undefined;
	if (!snapshot) return fromSession;

	return {
		...snapshot,
		...fromSession,
		id: fromSession.id ?? snapshot.id,
		displayName: fromSession.displayName ?? snapshot.displayName,
		nsfwFiltering: fromSession.nsfwFiltering ?? snapshot.nsfwFiltering,
		bggUsername: fromSession.bggUsername ?? snapshot.bggUsername,
		name: fromSession.name ?? snapshot.name,
		image: fromSession.image ?? snapshot.image,
		email: fromSession.email ?? snapshot.email,
		role: fromSession.role.length ? fromSession.role : snapshot.role,
		emailVerified: fromSession.emailVerified ?? snapshot.emailVerified,
		twoFactorEnabled: fromSession.twoFactorEnabled ?? snapshot.twoFactorEnabled,
		banned: fromSession.banned ?? snapshot.banned,
		createdAt: fromSession.createdAt ?? snapshot.createdAt,
		albums: fromSession.albums.length ? fromSession.albums : snapshot.albums
	};
}

export function displayLabel(
	user: Pick<ProfileUserView, 'displayName' | 'name' | 'email'>
): string {
	return user.displayName || user.name || user.email || 'Account';
}
