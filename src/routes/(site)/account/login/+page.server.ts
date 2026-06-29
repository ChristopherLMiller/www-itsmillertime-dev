import { loadSession } from '$lib/auth/loadSession';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, fetch, request }) => {
	const parentData = await parent();
	const session =
		(parentData.session as Awaited<ReturnType<typeof loadSession>>) ??
		(await loadSession(fetch, request));
	if (session?.user) {
		redirect(302, '/account/profile');
	}
	return {};
};
