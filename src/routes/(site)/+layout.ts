import { browser } from '$app/environment';
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

	// Client: always refresh session (e.g. after login). SSR: reuse server layout.
	const session = browser
		? await loadSession(event.fetch, request)
		: (parentData.session ?? (await loadSession(event.fetch, request)));

	// SSR seed comes from +layout.server.ts (fetched in parallel with session).
	const initialLayout = browser ? null : (parentData.initialLayout ?? null);

	return { session, initialLayout };
};
