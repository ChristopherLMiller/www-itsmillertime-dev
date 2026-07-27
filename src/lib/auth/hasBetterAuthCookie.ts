/** True when the request likely has a Better Auth session cookie. */
export function hasBetterAuthCookie(cookie: string | null | undefined): boolean {
	if (!cookie) return false;
	return /(?:^|;\s*)(?:__Secure-)?better-auth\./.test(cookie);
}
