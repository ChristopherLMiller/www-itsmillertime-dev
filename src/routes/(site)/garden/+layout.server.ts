import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { session } = await parent();
	if (!session?.user) {
		redirect(302, '/account/login');
	}
	const roles = session.user.role as string[] | undefined;
	if (!roles?.includes('admin')) {
		error(403, 'Forbidden');
	}
	return {};
};
