import { loadSessionFromEvent, type SessionShape } from '$lib/auth/loadSession.server';
import { headerReferer, resolveReturnUrl, urlToPath } from '$lib/auth/returnTo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { url, request } = event;
	const parentData = await event.parent();
	const session = (parentData.session as SessionShape) ?? (await loadSessionFromEvent(event));
	const returnTo = urlToPath(
		resolveReturnUrl(url.origin, '/account/profile', [
			url.searchParams.get('callbackURL'),
			headerReferer(request.headers)
		])
	);
	if (session?.user) {
		redirect(302, returnTo);
	}
	return { returnTo };
};
