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

/** Same-origin return URL that is not an auth flow page. */
export function sanitizeReturnUrl(
	raw: string | null | undefined,
	origin: string,
	fallbackPath: string
): string {
	const resolved = sameOriginReturnUrl(raw, origin, fallbackPath);
	try {
		if (isAuthFlowPath(new URL(resolved).pathname)) {
			return sameOriginReturnUrl(null, origin, fallbackPath);
		}
	} catch {
		return sameOriginReturnUrl(null, origin, fallbackPath);
	}
	return resolved;
}

/** After logout, skip profile too — it immediately redirects back to login. */
export function sanitizeLogoutReturnUrl(raw: string | null | undefined, origin: string): string {
	const resolved = sanitizeReturnUrl(raw, origin, '/');
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
