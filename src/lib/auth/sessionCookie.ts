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

/** Share across subdomains in production so apex/www/shop see the same session. */
export function sessionCookieDomain(host: string, isDev: boolean): string | undefined {
	if (isDev) return undefined;
	const hostname = host.split(':')[0] ?? host;
	if (hostname === 'itsmillertime.dev' || hostname.endsWith('.itsmillertime.dev')) {
		return '.itsmillertime.dev';
	}
	return undefined;
}

export function sessionCookieSecure(name: string, host: string, isDev: boolean): boolean {
	if (isDev) return false;
	return name.startsWith('__Secure-') || Boolean(sessionCookieDomain(host, isDev));
}
