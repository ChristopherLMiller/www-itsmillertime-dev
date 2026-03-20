import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { createPayloadFetch } from '$lib/payload';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, request }) => {
	const sessionResponse = await fetch('/api/auth/get-session');
	const session = sessionResponse.ok ? await sessionResponse.json() : null;

	if (session?.user) {
		const payloadFetch = createPayloadFetch(fetch, request);
		const meResponse = await payloadFetch(`${PUBLIC_PAYLOAD_API_ENDPOINT}/users/me`);
		const payloadMe = meResponse.ok ? await meResponse.json() : null;
		if (payloadMe?.user) {
			session.user = { ...session.user, ...payloadMe.user };
		}
	}

	return { session };
};
