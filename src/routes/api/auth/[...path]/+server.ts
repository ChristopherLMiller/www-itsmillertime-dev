import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { dev } from '$app/environment';
import {
	cookieHeaderForCms,
	dedupeSetCookies,
	parseRewrittenSetCookie,
	rewriteProxiedAuthCookie,
	sessionCookieSecure,
	shouldCommitCookiesWithHtmlHop
} from '$lib/auth/sessionCookie';
import { browserFacingLocation, redirectHtml } from '$lib/auth/sameOriginReturnUrl';
import type { RequestHandler } from './$types';

/**
 * Proxies all /api/auth/* requests to the Payload CMS backend.
 * This avoids CORS issues since the browser only talks to the SvelteKit server.
 *
 * Forwards Origin and X-Forwarded-Host so Better Auth builds the Authentik
 * redirect_uri for this site (www). Login starts at /account/login/authentik
 * so state and session cookies are first-party here, not on cms.
 *
 * OAuth callback 302 + Set-Cookie is converted to a 200 HTML hop so Android
 * Chrome commits the session cookie after returning from Authentik. Signed
 * Better Auth cookies are applied with `cookies.set` and identity encode so
 * HMAC signatures that contain `=` are not percent-encoded.
 */
const proxy: RequestHandler = async ({ request, params, url, cookies }) => {
	const path = params.path ?? '';
	const targetUrl = `${getPayloadApiBaseUrl()}/auth/${path}`;
	const fullUrl = `${targetUrl}${url.search}`;
	const forwardedProto = url.protocol.replace(':', '');

	const headers = new Headers(request.headers);
	headers.delete('accept-encoding');
	headers.delete('host');
	headers.set('x-forwarded-host', url.host);
	headers.set('x-forwarded-proto', forwardedProto);
	headers.set('x-auth-browser-host', url.host);
	headers.set('x-auth-browser-proto', forwardedProto);
	headers.set('origin', url.origin);
	headers.set('referer', `${url.origin}/`);

	const cookieHeader = cookieHeaderForCms(headers.get('cookie'), dev);
	if (cookieHeader) headers.set('cookie', cookieHeader);

	let requestBody: string | undefined;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		requestBody = await request.text();
	}

	const response = await fetch(fullUrl, {
		method: request.method,
		headers,
		body: requestBody,
		redirect: 'manual'
	});

	const setCookies = dedupeSetCookies(
		response.headers.getSetCookie().map((cookie) => rewriteProxiedAuthCookie(cookie, dev))
	);

	for (const cookie of setCookies) {
		const parsed = parseRewrittenSetCookie(cookie);
		if (!parsed) continue;
		cookies.set(parsed.name, parsed.value, {
			path: '/',
			httpOnly: parsed.httpOnly,
			sameSite: 'lax',
			secure: sessionCookieSecure(parsed.name, url.host, dev),
			...(parsed.maxAge !== undefined ? { maxAge: parsed.maxAge } : {}),
			encode: (value) => value
		});
	}

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers.entries()) {
		const lower = key.toLowerCase();
		if (lower === 'content-encoding' || lower === 'content-length') continue;
		if (lower === 'set-cookie') continue;
		responseHeaders.append(key, value);
	}

	if (shouldCommitCookiesWithHtmlHop(request.method, response.status, path, setCookies)) {
		const dest = browserFacingLocation(
			response.headers.get('location'),
			url.origin,
			'/account/profile'
		);
		responseHeaders.delete('location');
		responseHeaders.set('content-type', 'text/html; charset=utf-8');
		responseHeaders.set('cache-control', 'no-store');
		responseHeaders.set('referrer-policy', 'no-referrer');
		return new Response(redirectHtml(dest, 'Finishing sign-in…'), {
			status: 200,
			headers: responseHeaders
		});
	}

	const body = await response.arrayBuffer();

	return new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
