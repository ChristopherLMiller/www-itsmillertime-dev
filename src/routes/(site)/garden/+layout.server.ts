import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Anonymous → 404 (not redirect) so nav prefetch cannot loop /garden ↔ login. */
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
