import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Public signup is disabled — identity is managed via Authentik. */
export const load: PageServerLoad = async () => {
	redirect(302, '/account/login');
};
