import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { session } = await parent();
	if (!session?.user) {
		error(403, 'Forbidden');
	}
	const roles = session.user.role as string[] | undefined;
	if (!roles?.includes('admin')) {
		error(403, 'Forbidden');
	}
	return {};
};
