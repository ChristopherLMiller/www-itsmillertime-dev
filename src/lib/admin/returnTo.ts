export const ADMIN_RETURN_COOKIE = 'admin_return_to';

function isAdminPath(pathname: string): boolean {
	return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** Same-origin site path the admin header may send the browser back to. */
export function isSafeSiteReturnPath(path: string): boolean {
	if (!path.startsWith('/') || path.startsWith('//')) return false;
	const pathname = path.split(/[?#]/, 1)[0] ?? path;
	if (isAdminPath(pathname)) return false;
	if (path.includes('\\') || path.includes('://')) return false;
	return true;
}

export function sanitizeAdminReturnPath(raw: string | null | undefined): string {
	if (!raw) return '/';
	return isSafeSiteReturnPath(raw) ? raw : '/';
}

export function siteReturnPathFromUrl(url: URL): string | null {
	const path = `${url.pathname}${url.search}${url.hash}`;
	return isSafeSiteReturnPath(path) ? path : null;
}

function writeReturnCookie(path: string) {
	document.cookie = `${ADMIN_RETURN_COOKIE}=${encodeURIComponent(path)}; Path=/; SameSite=Lax`;
}

/** Remember the public page the admin entered from. No-op off-site / already in admin. */
export function rememberAdminReturnTo(url: URL): void {
	const path = siteReturnPathFromUrl(url);
	if (!path) return;
	try {
		sessionStorage.setItem(ADMIN_RETURN_COOKIE, path);
	} catch {
		/* private mode / quota */
	}
	try {
		writeReturnCookie(path);
	} catch {
		/* ignore */
	}
}

export function readAdminReturnTo(): string {
	try {
		const stored = sessionStorage.getItem(ADMIN_RETURN_COOKIE);
		if (stored && isSafeSiteReturnPath(stored)) return stored;
	} catch {
		/* ignore */
	}
	return '/';
}
