import { ADMIN_RETURN_COOKIE, sanitizeAdminReturnPath } from '$lib/admin/returnTo';
import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { canAccessAdmin } from '$lib/auth/requireAdmin.server';
import { hrefWithCallback } from '$lib/auth/returnTo';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const prerender = false;

export const load: LayoutServerLoad = async (event) => {
	const { cookies, url } = event;
	const session = await loadSessionFromEvent(event);
	if (!canAccessAdmin(session?.user)) {
		if (!session?.user) {
			redirect(302, hrefWithCallback('/account/login', `${url.pathname}${url.search}`));
		}
		error(403, 'Forbidden');
	}
	return {
		session,
		siteHref: sanitizeAdminReturnPath(cookies.get(ADMIN_RETURN_COOKIE))
	};
};
