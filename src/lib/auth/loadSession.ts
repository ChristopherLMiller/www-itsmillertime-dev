import { browser } from '$app/environment';
import { isBrowserOnline } from '$lib/utils/online';
import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
import { sessionFromAuthResponses } from '$lib/auth/mergePayloadUser';
import type { SessionShape } from '$lib/auth/sessionShape';

export type { SessionShape };

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
	if (request && !hasBetterAuthCookie(cookie)) {
		// Server-side anonymous document load — skip get-session entirely.
		return null;
	}
	// Browser: cookie header is usually unavailable on fetch(); still call get-session
	// (credentials: include) so HttpOnly session cookies are sent.
	const sessionInit: RequestInit = cookie
		? { headers: { cookie }, credentials: 'include' }
		: { credentials: 'include' };
	const meInit: RequestInit = { ...sessionInit, credentials: 'include' };
	const fetchMe = () => fetch('/api/users/me', meInit);

	try {
		const mePromise = hasBetterAuthCookie(cookie)
			? fetchMe().catch(() => null)
			: Promise.resolve(null);

		const [sessionResponse, meResponse] = await Promise.all([
			fetch('/api/auth/get-session', sessionInit),
			mePromise
		]);

		if (!sessionResponse.ok) {
			const retry = await fetch('/api/auth/get-session', sessionInit).catch(() => null);
			if (!retry?.ok) return null;
			return sessionFromAuthResponses(retry, null, () => fetchMe().catch(() => null));
		}

		return sessionFromAuthResponses(sessionResponse, meResponse, () => fetchMe().catch(() => null));
	} catch {
		return null;
	}
}
