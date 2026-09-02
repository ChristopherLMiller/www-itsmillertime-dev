import { isAdminRole } from '$lib/auth/isAdminRole';
import { mergeSessionUser } from '$lib/auth/mergePayloadUser';
import type { SessionShape } from '$lib/auth/sessionShape';

/**
 * Keep the client session from flickering when a background refetch fails or
 * returns a thinner user (e.g. get-session without a merged Payload /users/me).
 */
export function stabilizeSession(previous: SessionShape, next: SessionShape): SessionShape {
	if (!next?.user) {
		return previous?.user ? previous : next;
	}
	if (!previous?.user) {
		return next;
	}

	const user = mergeSessionUser(previous.user, next.user);
	if (isAdminRole(previous.user) && !isAdminRole(user)) {
		user.role = previous.user.role;
	}

	return { ...next, user };
}
