import { browser } from '$app/environment';
import { isBrowserOnline } from '$lib/cache/offlineSwr';
import { extractPayloadMeUser, mergeSessionUser } from '$lib/auth/mergePayloadUser';

export type SessionShape = {
	user?: Record<string, unknown>;
	session?: Record<string, unknown>;
} | null;

/**
 * Client-safe session load.
 * Merges Better Auth get-session with Payload `/users/me` via same-origin `/api/users/me`
 * so auth cookies stay on the site (direct CMS fetches cannot send them cross-origin).
 */
export async function loadSession(
	fetch: typeof globalThis.fetch,
	request?: Request
): Promise<SessionShape> {
	if (browser && !isBrowserOnline()) {
		return null;
	}

	const cookie = request?.headers.get('cookie');
	const sessionInit: RequestInit | undefined = cookie ? { headers: { cookie } } : undefined;

	try {
		const sessionResponse = await fetch('/api/auth/get-session', sessionInit);
		const session = sessionResponse.ok ? await sessionResponse.json() : null;

		if (session?.user) {
			try {
				const meResponse = await fetch('/api/users/me', {
					...sessionInit,
					credentials: 'include'
				});
				if (meResponse.ok) {
					const payloadMe = await meResponse.json();
					session.user = mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
				}
			} catch {
				// Offline or Payload unavailable — keep the base session.
			}
		}

		return session;
	} catch {
		return null;
	}
}
