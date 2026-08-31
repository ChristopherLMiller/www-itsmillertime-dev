import { getParentSession } from '$lib/auth/parentSession';
import { isAdminRole } from '$lib/auth/isAdminRole';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const session = await getParentSession(parent);
	if (!session?.user) {
		error(403, 'Forbidden');
	}
	if (!isAdminRole(session.user)) {
		error(403, 'Forbidden');
	}
	return {};
};
