import { extractPayloadMeUser, mergeSessionUser } from '$lib/auth/mergePayloadUser';
import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
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
		const payloadFetch = createPayloadFetch(fetch, request);
		// When a better-auth cookie is present, fetch session + /users/me together
		// to cut the SSR waterfall on every document load.
		const mePromise = hasBetterAuthCookie(cookie)
			? payloadFetch(`${getPayloadApiBaseUrl()}/users/me`).catch(() => null)
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
				const fallback = await payloadFetch(`${getPayloadApiBaseUrl()}/users/me`);
				if (fallback.ok) {
					const payloadMe = await fallback.json();
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
