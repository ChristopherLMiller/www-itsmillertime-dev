import { dev } from '$app/environment';
import { extractPayloadMeUser, mergeSessionUser } from '$lib/auth/mergePayloadUser';
import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import type { RequestEvent } from '@sveltejs/kit';

type MergedUser = ReturnType<typeof mergeSessionUser>;

/** Coalesce concurrent gallery/API session lookups for the same cookie. */
const sessionInflight = new Map<string, Promise<MergedUser | null>>();
const sessionCache = new Map<string, { expires: number; user: MergedUser | null }>();
const SESSION_CACHE_TTL_MS = 4_000;

/**
 * Same merge as `(site)/+layout.ts`: better-auth session + Payload `/users/me`
 * so `role` (e.g. admin) is present when the user is logged in.
 *
 * Skips work when there is no auth cookie (anonymous gallery traffic).
 * Talks to Payload directly (no self-fetch to `/api/auth/get-session`) and
 * dedupes/caches briefly so batched image requests do not stampede auth.
 */
export async function getMergedSessionUser(event: RequestEvent) {
	const cookie = event.request.headers.get('cookie') ?? '';
	if (!hasBetterAuthCookie(cookie)) return null;

	const cached = sessionCache.get(cookie);
	if (cached && cached.expires > Date.now()) return cached.user;

	const existing = sessionInflight.get(cookie);
	if (existing) return existing;

	const promise = loadMergedSessionUser(event, cookie).finally(() => {
		sessionInflight.delete(cookie);
	});
	sessionInflight.set(cookie, promise);
	return promise;
}

async function loadMergedSessionUser(
	event: RequestEvent,
	cookie: string
): Promise<MergedUser | null> {
	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const apiBase = getPayloadApiBaseUrl();

	const [sessionRes, meRes] = await Promise.all([
		payloadFetch(`${apiBase}/auth/get-session`).catch(() => null),
		payloadFetch(`${apiBase}/users/me`).catch(() => null)
	]);

	if (!sessionRes?.ok) {
		sessionCache.set(cookie, { expires: Date.now() + SESSION_CACHE_TTL_MS, user: null });
		return null;
	}

	const session = await sessionRes.json();
	if (!session?.user) {
		sessionCache.set(cookie, { expires: Date.now() + SESSION_CACHE_TTL_MS, user: null });
		return null;
	}

	let payloadMe = meRes?.ok ? await meRes.json() : null;
	if (!payloadMe) {
		const fallback = await payloadFetch(`${apiBase}/users/me`);
		payloadMe = fallback.ok ? await fallback.json() : null;
	}

	const user = mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
	sessionCache.set(cookie, { expires: Date.now() + SESSION_CACHE_TTL_MS, user });
	return user;
}

export function isAdminRole(user: { role?: unknown } | null | undefined): boolean {
	const role = user?.role;
	if (Array.isArray(role)) return role.includes('admin');
	return role === 'admin';
}

/**
 * `/admin` and `/api/admin` are open on the Vite dev server, otherwise the
 * signed-in user must have the `admin` role. Deployed builds (including the
 * git `dev` environment) have `dev === false`.
 */
export function canAccessAdmin(
	user: { role?: unknown } | null | undefined,
	isDev: boolean = dev
): boolean {
	return isDev || isAdminRole(user);
}

export function isProtectedAdminPath(pathname: string): boolean {
	return (
		pathname === '/admin' ||
		pathname.startsWith('/admin/') ||
		pathname === '/api/admin' ||
		pathname.startsWith('/api/admin/')
	);
}
