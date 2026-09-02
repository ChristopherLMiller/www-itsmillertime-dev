import { loadSessionFromEvent, type SessionShape } from '$lib/auth/loadSession.server';
import { hrefWithCallback } from '$lib/auth/returnTo';
import { redirect, type RequestEvent } from '@sveltejs/kit';

export async function requireAccountSession(
	event: RequestEvent
): Promise<NonNullable<SessionShape>> {
	const session = await loadSessionFromEvent(event);
	if (!session?.user) {
		redirect(302, hrefWithCallback('/account/login', event.url.pathname + event.url.search));
	}
	return session;
}
