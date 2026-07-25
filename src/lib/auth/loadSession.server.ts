import { extractPayloadMeUser, mergeSessionUser } from '$lib/auth/mergePayloadUser';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';

export type SessionShape = {
	user?: Record<string, unknown>;
	session?: Record<string, unknown>;
} | null;

/** Server-only session load (direct CMS URL for /users/me merge). */
export async function loadSession(
	fetch: typeof globalThis.fetch,
	request: Request
): Promise<SessionShape> {
	const cookie = request.headers.get('cookie');
	const sessionInit: RequestInit | undefined = cookie ? { headers: { cookie } } : undefined;

	try {
		const sessionResponse = await fetch('/api/auth/get-session', sessionInit);
		const session = sessionResponse.ok ? await sessionResponse.json() : null;

		if (session?.user) {
			try {
				const payloadFetch = createPayloadFetch(fetch, request);
				const meResponse = await payloadFetch(`${getPayloadApiBaseUrl()}/users/me`);
				if (meResponse.ok) {
					const payloadMe = await meResponse.json();
					session.user = mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
				}
			} catch {
				// Payload unavailable — keep the base session.
			}
		}

		return session;
	} catch {
		return null;
	}
}
