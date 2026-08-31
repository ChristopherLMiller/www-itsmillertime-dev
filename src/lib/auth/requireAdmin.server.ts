import { dev } from '$app/environment';
import { isAdminRole } from '$lib/auth/isAdminRole';
import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import type { RequestEvent } from '@sveltejs/kit';

export { isAdminRole };

/**
 * Same merge as `(site)/+layout.ts`: better-auth session + Payload `/users/me`
 * so `role` (e.g. admin) is present when the user is logged in.
 */
export async function getMergedSessionUser(event: RequestEvent) {
	const session = await loadSessionFromEvent(event);
	return session?.user ?? null;
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
