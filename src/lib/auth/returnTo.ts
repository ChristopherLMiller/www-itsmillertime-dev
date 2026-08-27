import { sameOriginReturnUrl } from './sameOriginReturnUrl';

const AUTH_FLOW_PREFIXES = ['/account/login', '/account/logout', '/account/sign-up'];

export const CALLBACK_QUERY = 'callbackURL';

function isAuthFlowPath(pathname: string): boolean {
	return AUTH_FLOW_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

export function urlToPath(absoluteUrl: string): string {
	try {
		const parsed = new URL(absoluteUrl);
		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return '/';
	}
}

export function headerReferer(headers: Headers): string | null {
	return headers.get('referer') ?? headers.get('referrer');
}

/** Same-origin content URL, or null if missing / off-origin / an auth flow page. */
export function parseReturnUrl(raw: string | null | undefined, origin: string): string | null {
	if (raw == null || raw.trim() === '') return null;
	try {
		const target = new URL(raw, origin);
		if (target.origin !== origin) return null;
		if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
		if (isAuthFlowPath(target.pathname)) return null;
		return target.toString();
	} catch {
		return null;
	}
}

/** First usable candidate, else the fallback path on this origin. */
export function resolveReturnUrl(
	origin: string,
	fallbackPath: string,
	candidates: Array<string | null | undefined>
): string {
	for (const raw of candidates) {
		const parsed = parseReturnUrl(raw, origin);
		if (parsed) return parsed;
	}
	return sameOriginReturnUrl(null, origin, fallbackPath);
}

/** Same-origin return URL that is not an auth flow page. */
export function sanitizeReturnUrl(
	raw: string | null | undefined,
	origin: string,
	fallbackPath: string
): string {
	return resolveReturnUrl(origin, fallbackPath, [raw]);
}

function sendLogoutHomeFromProfile(resolved: string, origin: string): string {
	try {
		const path = new URL(resolved).pathname;
		if (path === '/account/profile' || path.startsWith('/account/profile/')) {
			return `${origin}/`;
		}
	} catch {
		return `${origin}/`;
	}
	return resolved;
}

/**
 * After logout, skip profile — it immediately redirects back to login.
 * Prefer an explicit callback, then the document/HTTP referrer, then home.
 */
export function sanitizeLogoutReturnUrl(
	raw: string | null | undefined,
	origin: string,
	referrer?: string | null
): string {
	return sendLogoutHomeFromProfile(resolveReturnUrl(origin, '/', [raw, referrer]), origin);
}

export function currentReturnPath(url: URL, extraBlocked: string[] = []): string | null {
	if (isAuthFlowPath(url.pathname) || extraBlocked.includes(url.pathname)) return null;
	return `${url.pathname}${url.search}`;
}

export function hrefWithCallback(href: string, returnPath: string | null | undefined): string {
	if (!returnPath) return href;
	const parsed = new URL(href, 'https://www.itsmillertime.dev');
	parsed.searchParams.set(CALLBACK_QUERY, returnPath);
	return `${parsed.pathname}${parsed.search}`;
}
