export type GalleryVisibility = 'ALL' | 'AUTHENTICATED' | 'PRIVILEGED';

export type GalleryAccessSettings = {
	isNsfw?: boolean | null;
	visibility?: GalleryVisibility | null;
	permittedRoles?: string[] | null;
	allowedUsers?: (number | { id?: number | null } | null)[] | null;
};

export type GalleryAccessUser = {
	id?: number | string | null;
	role?: string[] | null;
	nsfwFiltering?: string | null;
};

/**
 * True when Payload media bytes require an authenticated request (forward cookies via
 * `/api/media-proxy`). Public `visibility: ALL` non-NSFW files can be loaded directly.
 */
export function mediaRequiresAuthProxy(
	settings: GalleryAccessSettings | null | undefined
): boolean {
	if (!settings) return false;
	if (settings.isNsfw === true) return true;
	const visibility = settings.visibility ?? 'ALL';
	return visibility !== 'ALL';
}

/** Mirrors Payload gallery visibility + NSFW read access for the public site session. */
export function canAccessGallerySettings(
	settings: GalleryAccessSettings | null | undefined,
	user: GalleryAccessUser | null | undefined
): boolean {
	if (!settings) return false;

	const visibility = settings.visibility ?? 'ALL';
	const isNsfw = settings.isNsfw === true;
	const roles = Array.isArray(user?.role) ? user.role : [];
	const isAdmin = roles.includes('admin');

	if (isAdmin) return true;

	if (!user) {
		if (isNsfw) return false;
		return visibility === 'ALL';
	}

	if (isNsfw && (user.nsfwFiltering ?? '').toLowerCase() === 'hide') {
		return false;
	}

	if (visibility === 'ALL' || visibility === 'AUTHENTICATED') {
		return true;
	}

	if (visibility !== 'PRIVILEGED') {
		return false;
	}

	const permittedRoles = settings.permittedRoles ?? [];
	if (permittedRoles.some((role) => roles.includes(role))) {
		return true;
	}

	const userId = user.id;
	if (userId == null) return false;

	return (settings.allowedUsers ?? []).some((entry) => {
		if (typeof entry === 'number') return entry === userId;
		if (entry && typeof entry === 'object' && typeof entry.id === 'number') {
			return entry.id === userId;
		}
		return false;
	});
}
