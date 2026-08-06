import { loadSession } from '$lib/auth/loadSession';
import type { LayoutCacheData } from '$lib/cache/layoutCache';
import type { LayoutLoad } from './$types';

export type { LayoutCacheData };

export const load: LayoutLoad = async (event) => {
	event.depends('app:layout');

	const parentData = (await event.parent()) as {
		session?: Awaited<ReturnType<typeof loadSession>>;
		initialLayout?: LayoutCacheData | null;
	};
	const request = 'request' in event ? (event.request as Request) : undefined;

	// Prefer SSR-serialized values so the client universal load matches server HTML during hydration.
	// (Re-fetching session / nulling layout on browser caused root hydration_mismatch in SiteChrome.)
	const session = parentData.session ?? (await loadSession(event.fetch, request));
	const initialLayout = parentData.initialLayout ?? null;

	return { session, initialLayout };
};
