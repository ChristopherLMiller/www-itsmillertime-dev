import { browser } from '$app/environment';
import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { isBrowserOnline } from '$lib/cache/offlineSwr';
import { createPayloadFetch } from '$lib/payload';

export async function loadSession(
	fetch: typeof globalThis.fetch,
	request?: Request
): Promise<{ user?: Record<string, unknown> } | null> {
	if (browser && !isBrowserOnline()) {
		return null;
	}

	const cookie = request?.headers.get('cookie');
	const sessionInit: RequestInit | undefined = cookie ? { headers: { cookie } } : undefined;

	try {
		const sessionResponse = await fetch('/api/auth/get-session', sessionInit);
		const session = sessionResponse.ok ? await sessionResponse.json() : null;

		if (session?.user && request) {
			try {
				const payloadFetch = createPayloadFetch(fetch, request);
				const base = browser
					? PUBLIC_PAYLOAD_API_ENDPOINT.replace(/\/$/, '')
					: (await import('$lib/payload/api-base-url.server')).getPayloadApiBaseUrl();
				const meResponse = await payloadFetch(`${base}/users/me`);
				const payloadMe = meResponse.ok ? await meResponse.json() : null;
				if (payloadMe?.user) {
					session.user = { ...session.user, ...payloadMe.user };
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
