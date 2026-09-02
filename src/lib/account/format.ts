import { convertDate } from '$lib/utils/convertDate/convertDate';

export function formatMemberSince(value: string | null | undefined): string | null {
	if (!value) return null;
	const formatted = convertDate(value);
	return formatted === 'Invalid Date' ? null : formatted;
}

export function formatDateTime(value: string | Date | null | undefined): string {
	if (value == null) return 'Unknown';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return 'Unknown';
	return date.toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}

export function nsfwLabel(value: string | null | undefined): string {
	switch (value) {
		case 'hide':
			return 'Hide NSFW content';
		case 'blur':
			return 'Blur until revealed';
		case 'show':
			return 'Show NSFW content';
		default:
			return 'Not set';
	}
}

const ACCESS_ROLE_LABELS: Record<string, string> = {
	admin: 'Admin',
	family: 'Family',
	friend: 'Friend',
	client: 'Client',
	user: 'Member'
};

const ACCESS_ROLE_ORDER = ['admin', 'family', 'friend', 'client', 'user'] as const;

/** Chips for the access groups on this account. `user` is labeled Member. */
export function accessRoleChips(roles: string[]): { id: string; label: string }[] {
	return ACCESS_ROLE_ORDER.filter((role) => roles.includes(role)).map((role) => ({
		id: role,
		label: ACCESS_ROLE_LABELS[role]
	}));
}

/** Human labels for Payload access groups. `user` is the default signed-in role. */
export function formatAccessRoles(roles: string[]): string | null {
	const named = ACCESS_ROLE_ORDER.filter((role) => role !== 'user' && roles.includes(role)).map(
		(role) => ACCESS_ROLE_LABELS[role]
	);
	if (named.length) return named.join(', ');
	if (roles.includes('user')) return 'Member';
	return null;
}
