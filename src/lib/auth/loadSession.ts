import { browser } from '$app/environment';
import { isBrowserOnline } from '$lib/utils/online';
import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
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

	// Prefer the Request cookie jar (includes HttpOnly). document.cookie cannot.
	const cookie = request?.headers.get('cookie') ?? null;
	const sessionInit: RequestInit = cookie
		? { headers: { cookie }, credentials: 'include' }
		: { credentials: 'include' };

	try {
		const meInit: RequestInit = { ...sessionInit, credentials: 'include' };
		const mePromise = hasBetterAuthCookie(cookie)
			? fetch('/api/users/me', meInit).catch(() => null)
			: Promise.resolve(null);

		const [sessionResponse, meResponse] = await Promise.all([
			fetch('/api/auth/get-session', sessionInit),
			mePromise
		]);
		const session = sessionResponse.ok ? await sessionResponse.json() : null;

		if (session?.user && meResponse?.ok) {
			try {
				const payloadMe = await meResponse.json();
				session.user = mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
			} catch {
				// Payload body unreadable — keep the base session.
			}
		} else if (session?.user && !meResponse) {
			try {
				const fallback = await fetch('/api/users/me', meInit);
				if (fallback.ok) {
					const payloadMe = await fallback.json();
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
