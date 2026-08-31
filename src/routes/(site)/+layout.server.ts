import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import type { LayoutCacheData } from '$lib/cache/layoutCache';
import type { LayoutServerLoad } from './$types';

/** Server-side session + layout seed for every (site) document load. */
export const load: LayoutServerLoad = async (event) => {
	const [session, initialLayout] = await Promise.all([
		loadSessionFromEvent(event),
		event
			.fetch('/api/layout-data')
			.then(async (res) => (res.ok ? ((await res.json()) as LayoutCacheData) : null))
			.catch(() => null)
	]);

	return { session, initialLayout };
};
