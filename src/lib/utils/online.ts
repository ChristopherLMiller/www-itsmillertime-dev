import { browser } from '$app/environment';

/** True on the server (assume reachable) or when the browser reports a network connection. */
export function isBrowserOnline(): boolean {
	return !browser || navigator.onLine;
}
