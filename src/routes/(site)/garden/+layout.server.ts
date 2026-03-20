import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Anonymous users get 404 (not redirect-to-login) so nav prefetch cannot loop login ↔ /garden and block auth. */
export const load: LayoutServerLoad = async ({ parent }) => {
	const { session } = await parent();
	if (!session?.user) {
		error(404, 'Not found');
	}
	const roles = session.user.role as string[] | undefined;
	if (!roles?.includes('admin')) {
		error(403, 'Forbidden');
	}
	return {};
};
