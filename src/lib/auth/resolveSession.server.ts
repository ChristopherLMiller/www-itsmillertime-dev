import { hasBetterAuthCookie } from '$lib/auth/hasBetterAuthCookie';
import { sessionFromAuthResponses } from '$lib/auth/mergePayloadUser';
import type { SessionShape } from '$lib/auth/sessionShape';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import type { RequestEvent } from '@sveltejs/kit';

export type { SessionShape };

export type SessionResolveStatus = 'authenticated' | 'unauthenticated' | 'unavailable';

export type SessionResolveResult = {
	status: SessionResolveStatus;
	session: SessionShape;
};

/** Coalesce concurrent gallery/API session lookups for the same cookie. */
const sessionInflight = new Map<string, Promise<SessionShape>>();
const sessionCache = new Map<string, { expires: number; session: SessionShape }>();
const SESSION_CACHE_TTL_MS = 4_000;

async function fetchOnce(
	payloadFetch: typeof globalThis.fetch,
	url: string
): Promise<Response | null> {
	try {
		return await payloadFetch(url);
	} catch {
		return null;
	}
}

/**
 * Authentik → Better Auth cookie on www → Payload user.
 * Talks to CMS directly with forwarded browser host/proto so the session
 * cookie name (`__Secure-` vs plain) matches what Better Auth expects.
 */
export async function resolveSession(
	fetchFn: typeof globalThis.fetch,
	request: Request
): Promise<SessionResolveResult> {
	if (!hasBetterAuthCookie(request.headers.get('cookie'))) {
		return { status: 'unauthenticated', session: null };
	}

	const payloadFetch = createPayloadFetch(fetchFn, request);
	const apiBase = getPayloadApiBaseUrl();

	let [sessionRes, meRes] = await Promise.all([
		fetchOnce(payloadFetch, `${apiBase}/auth/get-session`),
		fetchOnce(payloadFetch, `${apiBase}/users/me`)
	]);

	if (!sessionRes || sessionRes.status >= 500) {
		sessionRes = await fetchOnce(payloadFetch, `${apiBase}/auth/get-session`);
	}
	if (!sessionRes) {
		return { status: 'unavailable', session: null };
	}
	if (sessionRes.status >= 500) {
		return { status: 'unavailable', session: null };
	}
	if (!sessionRes.ok) {
		return { status: 'unauthenticated', session: null };
	}

	const session = await sessionFromAuthResponses(sessionRes, meRes, () =>
		fetchOnce(payloadFetch, `${apiBase}/users/me`)
	);
	if (!session?.user) {
		return { status: 'unauthenticated', session: session ?? null };
	}
	return { status: 'authenticated', session };
}

export function shouldCacheSessionResolve(status: SessionResolveStatus): boolean {
	return status !== 'unavailable';
}

/** Server-only session load (direct CMS URL for get-session + /users/me merge). */
export async function loadSession(
	fetchFn: typeof globalThis.fetch,
	request: Request
): Promise<SessionShape> {
	const result = await resolveSession(fetchFn, request);
	return result.session;
}

/**
 * One session per request (`event.locals`) plus a short cross-request cache
 * so batched gallery image requests do not stampede Payload.
 */
export async function loadSessionFromEvent(event: RequestEvent): Promise<SessionShape> {
	if (event.locals.session !== undefined) return event.locals.session;

	const cookie = event.request.headers.get('cookie') ?? '';
	if (!hasBetterAuthCookie(cookie)) {
		event.locals.session = null;
		return null;
	}

	const cached = sessionCache.get(cookie);
	if (cached && cached.expires > Date.now()) {
		event.locals.session = cached.session;
		return cached.session;
	}

	const existing = sessionInflight.get(cookie);
	if (existing) {
		const session = await existing;
		event.locals.session = session;
		return session;
	}

	const promise = resolveSession(event.fetch, event.request)
		.then((result) => {
			if (shouldCacheSessionResolve(result.status)) {
				sessionCache.set(cookie, {
					expires: Date.now() + SESSION_CACHE_TTL_MS,
					session: result.session
				});
			}
			return result.session;
		})
		.finally(() => {
			sessionInflight.delete(cookie);
		});

	sessionInflight.set(cookie, promise);
	const session = await promise;
	event.locals.session = session;
	return session;
}
