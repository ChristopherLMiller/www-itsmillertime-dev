import { dev } from '$app/environment';
import {
	SESSION_MAX_AGE,
	cookieNameForSite,
	isSessionCookieName,
	sessionCookieDomain,
	sessionCookieSecure
} from '$lib/auth/sessionCookie';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import type { Cookies } from '@sveltejs/kit';

/**
 * Exchange the CMS OAuth continue ticket and set a first-party session cookie.
 * Mobile Chrome/Safari drop cookies set on the cms → www redirect after Authentik;
 * this cookie is set by www itself so it is first-party.
 */
export async function consumeFrontendOAuthTicket(
	ticket: string,
	cookies: Cookies,
	fetchFn: typeof fetch,
	host: string
): Promise<boolean> {
	if (!ticket) return false;

	let response: Response;
	try {
		response = await fetchFn(`${getPayloadApiBaseUrl()}/frontend-oauth-exchange`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ticket })
		});
	} catch {
		return false;
	}

	if (!response.ok) return false;

	let data: { name?: unknown; value?: unknown; maxAge?: unknown };
	try {
		data = (await response.json()) as { name?: unknown; value?: unknown; maxAge?: unknown };
	} catch {
		return false;
	}

	if (typeof data.name !== 'string' || typeof data.value !== 'string') return false;
	if (!isSessionCookieName(data.name) || !data.value) return false;

	const name = cookieNameForSite(data.name, dev);
	const maxAge = typeof data.maxAge === 'number' && data.maxAge > 0 ? data.maxAge : SESSION_MAX_AGE;

	cookies.set(name, data.value, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: sessionCookieSecure(name, host, dev),
		maxAge,
		domain: sessionCookieDomain(host, dev),
		// Keep the Better Auth token verbatim; default encodeURIComponent would break verification.
		encode: (value) => value
	});

	return true;
}
