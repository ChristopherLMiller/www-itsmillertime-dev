import { canAccessAdmin } from '$lib/auth/requireAdmin.server';
import { hrefWithCallback } from '$lib/auth/returnTo';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, url }) => {
	const { session } = await parent();
	if (canAccessAdmin(session?.user)) {
		return {};
	}
	if (!session?.user) {
		redirect(302, hrefWithCallback('/account/login', `${url.pathname}${url.search}`));
	}
	error(403, 'Forbidden');
};
