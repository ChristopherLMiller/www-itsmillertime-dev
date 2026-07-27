import { extractPayloadMeUser, mergeSessionUser } from '$lib/auth/mergePayloadUser';
import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Same merge as `(site)/+layout.ts`: better-auth session + Payload `/users/me`
 * so `role` (e.g. admin) is present when the user is logged in.
 */
export async function getMergedSessionUser(event: RequestEvent) {
	const cookie = event.request.headers.get('cookie') ?? '';
	const payloadFetch = createPayloadFetch(event.fetch, event.request);

	const mePromise = hasBetterAuthCookie(cookie)
		? payloadFetch(`${getPayloadApiBaseUrl()}/users/me`).catch(() => null)
		: Promise.resolve(null);

	const [sessionRes, meRes] = await Promise.all([
		event.fetch(`${event.url.origin}/api/auth/get-session`, {
			headers: { cookie }
		}),
		mePromise
	]);
	if (!sessionRes.ok) return null;
	const session = await sessionRes.json();
	if (!session?.user) return null;

	let payloadMe = meRes?.ok ? await meRes.json() : null;
	if (!payloadMe) {
		const fallback = await payloadFetch(`${getPayloadApiBaseUrl()}/users/me`);
		payloadMe = fallback.ok ? await fallback.json() : null;
	}
	return mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
}

export function isAdminRole(user: { role?: unknown } | null | undefined): boolean {
	const roles = user?.role as string[] | undefined;
	return !!roles?.includes('admin');
}
