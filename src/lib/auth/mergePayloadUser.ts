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
