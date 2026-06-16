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

	try {
		const sessionResponse = await fetch('/api/auth/get-session');
		const session = sessionResponse.ok ? await sessionResponse.json() : null;

		if (session?.user && request) {
			try {
				const payloadFetch = createPayloadFetch(fetch, request);
				const meResponse = await payloadFetch(`${PUBLIC_PAYLOAD_API_ENDPOINT}/users/me`);
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
