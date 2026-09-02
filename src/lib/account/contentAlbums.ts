import { formatAccessRoles } from './format';
import type { Media } from '$lib/types/payload-types';

export type ContentAlbumView = {
	title: string;
	slug: string;
	isNsfw: boolean;
	group: 'shared' | 'role';
	via: string | null;
	cover: Media | null;
	needsProxy: boolean;
};

export function describeContentAlbum(input: {
	assigned: boolean;
	allowed: boolean;
	matchingRoles: string[];
}): Pick<ContentAlbumView, 'group' | 'via'> {
	if (input.assigned || input.allowed) {
		return { group: 'shared', via: 'Shared' };
	}
	return { group: 'role', via: formatAccessRoles(input.matchingRoles) };
}

export function allowedUserMatches(allowedUsers: unknown, userId: number): boolean {
	if (!Array.isArray(allowedUsers)) return false;
	return allowedUsers.some((entry) => {
		if (typeof entry === 'number') return entry === userId;
		if (entry && typeof entry === 'object' && 'id' in entry) {
			return Number((entry as { id: unknown }).id) === userId;
		}
		return false;
	});
}

export function albumCoverMedia(raw: unknown): Media | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
	const img = raw as Record<string, unknown>;
	if (typeof img.id !== 'number') return null;
	if (typeof img.url !== 'string' && (img.sizes == null || typeof img.sizes !== 'object')) {
		return null;
	}
	return img as unknown as Media;
}
