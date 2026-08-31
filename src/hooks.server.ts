import { canAccessAdmin, isProtectedAdminPath } from '$lib/auth/requireAdmin.server';
import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { hrefWithCallback } from '$lib/auth/returnTo';
import { error, json, type Handle, redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const ip = event.getClientAddress();
	const method = event.request.method;
	const path = event.url.pathname;

	if (
		hasBetterAuthCookie(event.request.headers.get('cookie')) &&
		!path.startsWith('/api/auth/')
	) {
		await loadSessionFromEvent(event);
	}

	if (isProtectedAdminPath(path)) {
		const user = event.locals.session?.user ?? null;
		if (!canAccessAdmin(user)) {
			const response = path.startsWith('/api/')
				? json({ error: 'Forbidden' }, { status: 403 })
				: null;
			if (response) {
				console.log(
					`[${new Date().toISOString()}] ${ip} ${method} ${path} ${response.status} ${Date.now() - start}ms`
				);
				return response;
			}
			if (!user) {
				redirect(302, hrefWithCallback('/account/login', `${path}${event.url.search}`));
			}
			error(403, 'Forbidden');
		}
	}

	const response = await resolve(event);

	const duration = Date.now() - start;
	console.log(
		`[${new Date().toISOString()}] ${ip} ${method} ${path} ${response.status} ${duration}ms`
	);

	return response;
};
