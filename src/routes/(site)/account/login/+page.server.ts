import { loadSession } from '$lib/auth/loadSession.server';
import { headerReferer, resolveReturnUrl, urlToPath } from '$lib/auth/returnTo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, request, url }) => {
	const parentData = await parent();
	const session =
		(parentData.session as Awaited<ReturnType<typeof loadSession>>) ??
		(await loadSession(fetch, request));
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
