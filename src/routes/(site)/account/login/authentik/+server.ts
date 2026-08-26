import { AUTHENTIK_PROVIDER_ID } from '$lib/auth/authentik-constants';
import { hrefWithCallback, sanitizeReturnUrl, urlToPath } from '$lib/auth/returnTo';
import { redirectHtml, sameOriginReturnUrl } from '$lib/auth/sameOriginReturnUrl';
import type { RequestHandler } from './$types';

/**
 * Start Authentik from this origin so state + session cookies are first-party on www.
 * Returns 200 HTML (not a 302 to Authentik) so mobile Chrome commits Set-Cookie
 * before leaving the site.
 */
export const GET: RequestHandler = async ({ url, fetch, request }) => {
	const origin = url.origin;
	const callbackURL = sanitizeReturnUrl(
		url.searchParams.get('callbackURL'),
		origin,
		'/account/profile'
	);
	const errorCallbackURL = sameOriginReturnUrl(
		url.searchParams.get('errorCallbackURL'),
		origin,
		hrefWithCallback('/account/login', urlToPath(callbackURL))
	);

	const start = await fetch('/api/auth/sign-in/oauth2', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie: request.headers.get('cookie') ?? '',
			origin
		},
		body: JSON.stringify({
			providerId: AUTHENTIK_PROVIDER_ID,
			callbackURL,
			errorCallbackURL,
			disableRedirect: true
		}),
		redirect: 'manual'
	});

	const headers = new Headers({
		'content-type': 'text/html; charset=utf-8',
		'cache-control': 'no-store',
		'referrer-policy': 'no-referrer'
	});
	for (const cookie of start.headers.getSetCookie()) {
		headers.append('set-cookie', cookie);
	}

	let authentikUrl: string | undefined;
	const location = start.headers.get('location');
	if (location && start.status >= 300 && start.status < 400) {
		authentikUrl = location;
	} else if (start.ok) {
		const data = (await start.json().catch(() => null)) as { url?: string } | null;
		authentikUrl = data?.url;
	}

	if (!authentikUrl) {
		const fail = new URL(errorCallbackURL);
		fail.searchParams.set('error', 'oauth_provider_not_found');
		return new Response(redirectHtml(fail.toString(), 'Sign-in failed.'), {
			status: 200,
			headers
		});
	}

	return new Response(redirectHtml(authentikUrl, 'Redirecting to Authentik…'), {
		status: 200,
		headers
	});
};
