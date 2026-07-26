import { browser } from '$app/environment';
import { loadSession } from '$lib/auth/loadSession';
import type { LayoutCacheData } from '$lib/cache/layoutCache';
import type { LayoutLoad } from './$types';

export type { LayoutCacheData };

export const load: LayoutLoad = async (event) => {
	event.depends('app:layout');

	const parentData = (await event.parent()) as {
		session?: Awaited<ReturnType<typeof loadSession>>;
	};
	const request = 'request' in event ? (event.request as Request) : undefined;
	// Client: always refresh (e.g. after login). SSR: reuse +layout.server.ts when available.
	const session = browser
		? await loadSession(event.fetch, request)
		: (parentData.session ?? (await loadSession(event.fetch, request)));

	// SSR seed so navigation/meta are present in the initial HTML. In the browser
	// the persisted TanStack cache provides instant data and revalidation.
	let initialLayout: LayoutCacheData | null = null;
	if (!browser) {
		try {
			const res = await event.fetch('/api/layout-data');
			if (res.ok) {
				initialLayout = (await res.json()) as LayoutCacheData;
			}
		} catch {
			initialLayout = null;
		}
	}

	return { session, initialLayout };
};
