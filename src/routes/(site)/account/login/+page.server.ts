import { loadSession } from '$lib/auth/loadSession.server';
import { sanitizeReturnUrl, urlToPath } from '$lib/auth/returnTo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, request, url }) => {
	const parentData = await parent();
	const session =
		(parentData.session as Awaited<ReturnType<typeof loadSession>>) ??
		(await loadSession(fetch, request));
	if (session?.user) {
		redirect(
			302,
			urlToPath(
				sanitizeReturnUrl(url.searchParams.get('callbackURL'), url.origin, '/account/profile')
			)
		);
	}
	return {};
};
