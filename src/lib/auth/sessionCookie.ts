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
	let sameSite: string | undefined;
	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower.startsWith('domain=')) continue;
		if (isDev && (lower === 'secure' || lower === 'partitioned')) continue;
		if (isDev && lower.startsWith('path=')) continue;
		if (lower.startsWith('samesite=')) {
			sameSite = attr;
			if (isDev) continue;
		}
		keep.push(attr);
	}

	const cookieName =
		isDev && name.startsWith('__Secure-better-auth.') ? name.replace('__Secure-', '') : name;

	if (isDev) {
		keep.push('Path=/');
		const sameSiteValue = sameSite?.split('=')[1]?.trim().toLowerCase();
		keep.push(
			sameSiteValue && sameSiteValue !== 'none' ? (sameSite ?? 'SameSite=Lax') : 'SameSite=Lax'
		);
	}

	return [cookieName + '=' + value, ...keep].join('; ');
}

/**
 * Browser-facing host/proto so Better Auth on an internal HTTP CMS still looks
 * up `__Secure-better-auth.*` when the user is on HTTPS www.
 */
export function browserAuthHeaders(request: Request | undefined): Record<string, string> {
	if (!request) return {};
	try {
		const url = new URL(request.url);
		const proto = url.protocol.replace(':', '');
		if (proto !== 'http' && proto !== 'https') return {};
		return {
			'x-forwarded-host': url.host,
			'x-forwarded-proto': proto,
			'x-auth-browser-host': url.host,
			'x-auth-browser-proto': proto,
			origin: url.origin
		};
	} catch {
		return {};
	}
}

/** Cookie aliases + forwarded browser origin for any server → CMS fetch. */
export function applyCmsAuthHeaders(headers: Headers, request: Request | undefined): void {
	const cookie = cookieHeaderForCms(request?.headers.get('cookie') ?? null);
	if (cookie) headers.set('cookie', cookie);
	for (const [key, value] of Object.entries(browserAuthHeaders(request))) {
		if (!headers.has(key)) headers.set(key, value);
	}
}

/**
 * Local HTTP stores unprefixed `better-auth.*` cookies. CMS may look up either
 * that name or `__Secure-better-auth.*` depending on X-Forwarded-Proto, so
 * always send both name variants.
 */
export function cookieHeaderForCms(cookieHeader: string | null | undefined): string | null {
	if (!cookieHeader) return null;
	const parts = cookieHeader
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean);
	const names = new Set<string>();
	for (const part of parts) {
		const name = part.split('=')[0];
		if (name) names.add(name);
	}
	const extra: string[] = [];
	for (const part of parts) {
		if (part.startsWith('better-auth.')) {
			const alias = `__Secure-${part}`;
			const aliasName = alias.split('=')[0];
			if (aliasName && !names.has(aliasName)) {
				extra.push(alias);
				names.add(aliasName);
			}
		} else if (part.startsWith('__Secure-better-auth.')) {
			const alias = part.slice('__Secure-'.length);
			const aliasName = alias.split('=')[0];
			if (aliasName && !names.has(aliasName)) {
				extra.push(alias);
				names.add(aliasName);
			}
		}
	}
	return extra.length ? [...parts, ...extra].join('; ') : cookieHeader;
}

export type ProxiedCookie = {
	name: string;
	value: string;
	maxAge?: number;
	httpOnly: boolean;
};

/** Parse a rewritten Set-Cookie so SvelteKit can set it without encodeURIComponent. */
export function parseRewrittenSetCookie(cookie: string): ProxiedCookie | null {
	const parts = cookie
		.split(';')
		.map((s) => s.trim())
		.filter(Boolean);
	const nameValue = parts[0];
	if (!nameValue) return null;
	const eq = nameValue.indexOf('=');
	if (eq < 1) return null;
	const name = nameValue.slice(0, eq);
	const value = nameValue.slice(eq + 1);
	let maxAge: number | undefined;
	let httpOnly = false;
	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower.startsWith('max-age=')) {
			const parsed = Number(attr.slice(8));
			if (Number.isFinite(parsed)) maxAge = parsed;
		}
		if (lower === 'httponly') httpOnly = true;
	}
	return { name, value, maxAge, httpOnly };
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
