import type { SessionShape } from './sessionShape';

/** Pull a user object out of Payload `/users/me` (shape varies by plugin version). */
export function extractPayloadMeUser(payloadMe: unknown): Record<string, unknown> | null {
	if (!payloadMe || typeof payloadMe !== 'object') return null;
	const body = payloadMe as Record<string, unknown>;

	if (body.user && typeof body.user === 'object' && body.user !== null) {
		return body.user as Record<string, unknown>;
	}

	// Some responses return the user document at the top level
	if (body.id != null || typeof body.email === 'string') {
		return body;
	}

	return null;
}

export function mergeSessionUser(
	sessionUser: Record<string, unknown>,
	payloadUser: Record<string, unknown> | null | undefined
): Record<string, unknown> {
	if (!payloadUser) return sessionUser;
	return { ...sessionUser, ...payloadUser };
}

/**
 * Combine Better Auth `get-session` with Payload `/users/me`.
 * Payload fields (especially `role`) overwrite the session user when present.
 */
export async function sessionFromAuthResponses(
	sessionResponse: Response | null,
	meResponse: Response | null,
	retryMe?: () => Promise<Response | null>
): Promise<SessionShape> {
	if (!sessionResponse?.ok) return null;

	let session: SessionShape;
	try {
		session = (await sessionResponse.json()) as SessionShape;
	} catch {
		return null;
	}
	if (!session?.user) return session ?? null;

	let me = meResponse;
	if (!me?.ok && retryMe) {
		try {
			me = await retryMe();
		} catch {
			me = null;
		}
	}
	if (me?.ok) {
		try {
			const payloadMe = await me.json();
			session.user = mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
		} catch {
			// Payload body unreadable — keep the base session.
		}
	}
	return session;
}
