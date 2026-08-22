import { consumeFrontendOAuthTicket } from '$lib/auth/consumeFrontendOAuthTicket.server';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Consume the CMS OAuth ticket before child account pages check the session. */
export const load: LayoutServerLoad = async ({ url, cookies, fetch }) => {
	const ticket = url.searchParams.get('ticket');
	if (!ticket) return {};

	const ok = await consumeFrontendOAuthTicket(ticket, cookies, fetch, url.host);
	const clean = new URL(url);
	clean.searchParams.delete('ticket');
	const next = `${clean.pathname}${clean.search}` || '/account/profile';

	if (!ok) {
		redirect(303, '/account/login?error=unable_to_create_session');
	}

	redirect(303, next);
};
