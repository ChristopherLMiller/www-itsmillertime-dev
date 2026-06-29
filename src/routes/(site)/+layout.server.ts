import { loadSession } from '$lib/auth/loadSession';
import type { LayoutServerLoad } from './$types';

/** Server-side session for +page.server.ts guards (universal +layout.ts data is not in parent() on client nav). */
export const load: LayoutServerLoad = async ({ fetch, request }) => {
	return {
		session: await loadSession(fetch, request)
	};
};
