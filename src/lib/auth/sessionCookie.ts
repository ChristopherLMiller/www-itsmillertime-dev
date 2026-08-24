const SESSION_COOKIE_NAME = /^(?:__Secure-)?better-auth\.session_token$/;

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function isSessionCookieName(name: string): boolean {
	return SESSION_COOKIE_NAME.test(name);
}

/** Local HTTP cannot use the `__Secure-` prefix. */
export function cookieNameForSite(name: string, isDev: boolean): string {
	if (isDev && name.startsWith('__Secure-better-auth.')) {
		return name.replace('__Secure-', '');
	}
	return name;
}

/**
 * Host-only cookies on www. Parent-domain (`Domain=.itsmillertime.dev`) cookies are
 * sent to auth.itsmillertime.dev and Android Chrome bounce-tracking drops them
 * after the Authentik round-trip.
 */
export function sessionCookieDomain(_host: string, _isDev: boolean): string | undefined {
	return undefined;
}

/** Strip Domain= so the cookie binds to this host only. Drop Secure in local HTTP. */
export function rewriteProxiedAuthCookie(cookie: string, isDev: boolean): string {
	const parts = cookie
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean);
	const nameValue = parts[0] ?? '';
	const [rawName, ...valueParts] = nameValue.split('=');
	const value = valueParts.join('=');
	const name = rawName ?? '';

	const keep: string[] = [];
	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower.startsWith('domain=')) continue;
		if (isDev && lower === 'secure') continue;
		keep.push(attr);
	}

	const cookieName =
		isDev && name.startsWith('__Secure-better-auth.') ? name.replace('__Secure-', '') : name;

	return [cookieName + '=' + value, ...keep].join('; ');
}

/** Last Set-Cookie for a name wins (CMS + proxy can emit duplicates). */
export function dedupeSetCookies(cookies: string[]): string[] {
	const byName = new Map<string, string>();
	for (const cookie of cookies) {
		const name = cookie.split('=')[0]?.trim();
		if (!name) continue;
		byName.set(name, cookie);
	}
	return [...byName.values()];
}

export function shouldCommitCookiesWithHtmlHop(
	method: string,
	status: number,
	path: string,
	setCookies: string[]
): boolean {
	if (method !== 'GET' && method !== 'HEAD') return false;
	if (status < 300 || status >= 400) return false;
	if (path.includes('oauth2/callback')) return true;
	return setCookies.some((cookie) => /^(?:__Secure-)?better-auth\./i.test(cookie));
}

export function sessionCookieSecure(name: string, host: string, isDev: boolean): boolean {
	if (isDev) return false;
	return name.startsWith('__Secure-') || Boolean(sessionCookieDomain(host, isDev));
}
