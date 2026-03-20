import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { createPayloadFetch } from '$lib/payload';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, request }) => {
	const sessionResponse = await fetch('/api/auth/get-session');
	const session = sessionResponse.ok ? await sessionResponse.json() : null;

	if (session?.user) {
		const payloadFetch = createPayloadFetch(fetch, request);
		const ac = new AbortController();
		const timeout = setTimeout(() => ac.abort(), 8000);
		try {
			const meResponse = await payloadFetch(`${PUBLIC_PAYLOAD_API_ENDPOINT}/users/me`, {
				signal: ac.signal
			});
			const payloadMe = meResponse.ok ? await meResponse.json() : null;
			if (payloadMe?.user) {
				session.user = { ...session.user, ...payloadMe.user };
			}
		} catch {
			// Payload unreachable or slow — keep better-auth session without merged Payload user
		} finally {
			clearTimeout(timeout);
		}
	}

	return { session };
};
