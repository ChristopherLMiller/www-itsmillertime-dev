import { browser } from '$app/environment';
import { loadSession } from '$lib/auth/loadSession';
import { stabilizeSession } from '$lib/auth/stabilizeSession';
import type { SessionShape } from '$lib/auth/sessionShape';
import type { LayoutCacheData } from '$lib/cache/layoutCache';
import type { LayoutLoad } from './$types';

export type { LayoutCacheData };

/** Last good client session — survives transient get-session /users/me failures. */
let clientSessionCache: SessionShape | undefined;

export const load: LayoutLoad = async (event) => {
	event.depends('app:layout');

	const parentData = (await event.parent()) as {
		session?: Awaited<ReturnType<typeof loadSession>>;
		initialLayout?: LayoutCacheData | null;
	};
	const request = 'request' in event ? (event.request as Request) : undefined;

	// Prefer SSR-serialized values so the client universal load matches server HTML during hydration.
	// (Re-fetching session / nulling layout on browser caused root hydration_mismatch in SiteChrome.)
	let session = parentData.session ?? (await loadSession(event.fetch, request));

	if (browser) {
		session = stabilizeSession(clientSessionCache ?? null, session);
		clientSessionCache = session;
	}

	const initialLayout = parentData.initialLayout ?? null;

	return { session, initialLayout };
};
