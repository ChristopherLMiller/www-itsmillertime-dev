import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Same merge as `(site)/+layout.ts`: better-auth session + Payload `/users/me`
 * so `role` (e.g. admin) is present when the user is logged in.
 */
export async function getMergedSessionUser(event: RequestEvent) {
	const sessionRes = await event.fetch(`${event.url.origin}/api/auth/get-session`, {
		headers: { cookie: event.request.headers.get('cookie') ?? '' }
	});
	if (!sessionRes.ok) return null;
	const session = await sessionRes.json();
	if (!session?.user) return null;

	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const meRes = await payloadFetch(`${getPayloadApiBaseUrl()}/users/me`);
	const payloadMe = meRes.ok ? await meRes.json() : null;
	if (payloadMe?.user) {
		return { ...session.user, ...payloadMe.user };
	}
	return session.user;
}

export function isAdminRole(user: { role?: unknown } | null | undefined): boolean {
	const roles = user?.role as string[] | undefined;
	return !!roles?.includes('admin');
}
