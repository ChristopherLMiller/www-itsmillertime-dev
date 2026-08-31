import { browser } from '$app/environment';

/** Ping interval while a logged-in tab is open (extends sliding session on CMS). */
export const SESSION_KEEPALIVE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/** Ask Better Auth (via CMS proxy) to extend the session if updateAge has elapsed. */
export async function refreshSessionCookie(): Promise<void> {
	await fetch('/api/auth/get-session', {
		method: 'GET',
		credentials: 'include',
		cache: 'no-store'
	});
}

/** Periodically refresh session cookies for long-lived tabs and on tab focus. */
export function startSessionKeepalive(): () => void {
	if (!browser) return () => {};

	const ping = () => {
		void refreshSessionCookie();
	};

	const onVisibility = () => {
		if (document.visibilityState === 'visible') ping();
	};

	document.addEventListener('visibilitychange', onVisibility);
	const intervalId = setInterval(ping, SESSION_KEEPALIVE_INTERVAL_MS);

	return () => {
		document.removeEventListener('visibilitychange', onVisibility);
		clearInterval(intervalId);
	};
}
