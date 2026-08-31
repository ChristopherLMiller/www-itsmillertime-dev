import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
import { headerReferer, hrefWithCallback, resolveReturnUrl, urlToPath } from '$lib/auth/returnTo';
import { redirectHtml, sameOriginReturnUrl } from '$lib/auth/sameOriginReturnUrl';
import type { RequestHandler } from './$types';

/**
 * Start Authentik on the CMS origin via /api/frontend-oauth-start.
 *
 * OAuth state and the Better Auth session cookie must commit on cms first.
 * CMS then hands off to www with a short-lived ticket; account/+layout.server.ts
 * exchanges it and sets a first-party www cookie.
 *
 * Starting OAuth on www (/api/auth/sign-in/oauth2) often finishes Authentik but
 * leaves www without a usable session — logging in on cms first "works" because
 * cms sets a shared .itsmillertime.dev cookie the frontend can reuse.
 */
export const GET: RequestHandler = async ({ url, request }) => {
	const origin = url.origin;
	const callbackURL = resolveReturnUrl(origin, '/account/profile', [
		url.searchParams.get('callbackURL'),
		headerReferer(request.headers)
	]);
	const errorCallbackURL = sameOriginReturnUrl(
		url.searchParams.get('errorCallbackURL'),
		origin,
		hrefWithCallback('/account/login', urlToPath(callbackURL))
	);

	const cmsStart = new URL('/api/frontend-oauth-start', PUBLIC_PAYLOAD_URL);
	cmsStart.searchParams.set('callbackURL', callbackURL);
	cmsStart.searchParams.set('errorCallbackURL', errorCallbackURL);

	return new Response(redirectHtml(cmsStart.toString(), 'Redirecting to sign in…'), {
		status: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
			'referrer-policy': 'no-referrer'
		}
	});
};
