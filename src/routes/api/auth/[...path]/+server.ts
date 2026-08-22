import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

const SHARED_COOKIE_DOMAIN = '.itsmillertime.dev';

/**
 * Rewrites Set-Cookie headers so cookies work when proxying to a different backend.
 * - Production on *.itsmillertime.dev: keep/force Domain=.itsmillertime.dev so OAuth
 *   state + session cookies are visible to www (and cms admin if shared).
 * - Local/dev: strip Domain so the cookie binds to the current host (localhost),
 *   and strip Secure / __Secure- so browsers accept cookies over HTTP.
 */
function rewriteSetCookie(cookie: string, requestHost: string): string {
	const [nameValue, ...attrs] = cookie.split('; ').map((s) => s.trim());
	const [name, ...valueParts] = nameValue.split('=');
	const value = valueParts.join('=').trim();

	const hostname = requestHost.split(':')[0] ?? requestHost;
	const shareAcrossSubdomains = !dev && hostname.endsWith('itsmillertime.dev');

	const keep: string[] = [];
	for (const attr of attrs) {
		const lower = attr.toLowerCase();
		if (lower.startsWith('domain=')) continue;
		if (dev && lower === 'secure') continue;
		keep.push(attr);
	}

	if (shareAcrossSubdomains) {
		keep.push(`Domain=${SHARED_COOKIE_DOMAIN}`);
	}

	const cookieName =
		dev && name.startsWith('__Secure-better-auth.') ? name.replace('__Secure-', '') : name;

	return [cookieName + '=' + value, ...keep].join('; ');
}

/**
 * Proxies all /api/auth/* requests to the Payload CMS backend.
 * This avoids CORS issues since the browser only talks to the SvelteKit server.
 *
 * Forwards Origin and X-Forwarded-Host so Better Auth builds the Authentik
 * redirect_uri for this site (www). Login starts at /account/login/authentik
 * so state and session cookies are first-party here, not on cms.
 *
 * Uses PAYLOAD_INTERNAL_URL (not the public CMS host) so Cloudflare cannot
 * overwrite X-Forwarded-Host to cms.itsmillertime.dev. Also sends
 * x-auth-browser-host for the CMS Next.js proxy to restore if a proxy still does.
 */
const proxy: RequestHandler = async ({ request, params, url }) => {
	const targetUrl = `${getPayloadApiBaseUrl()}/auth/${params.path}`;
	const fullUrl = `${targetUrl}${url.search}`;
	const forwardedProto = url.protocol.replace(':', '');

	const headers = new Headers(request.headers);
	headers.delete('accept-encoding');
	headers.delete('host');
	// Tell Better Auth the browser-facing origin so oauth2 redirect_uri matches
	// the host that holds the rewritten state cookie (this site, via the proxy).
	headers.set('x-forwarded-host', url.host);
	headers.set('x-forwarded-proto', forwardedProto);
	headers.set('x-auth-browser-host', url.host);
	headers.set('x-auth-browser-proto', forwardedProto);
	headers.set('origin', url.origin);
	headers.set('referer', `${url.origin}/`);

	if (dev) {
		const cookieHeader = headers.get('cookie');
		if (cookieHeader) {
			const rewritten = cookieHeader
				.split('; ')
				.map((c) => (c.startsWith('better-auth.') ? '__Secure-' + c : c))
				.join('; ');
			headers.set('cookie', rewritten);
		}
	}

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

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers.entries()) {
		const lower = key.toLowerCase();
		if (lower === 'content-encoding' || lower === 'content-length') continue;
		if (lower === 'set-cookie') continue;
		responseHeaders.append(key, value);
	}

	for (const cookie of response.headers.getSetCookie()) {
		responseHeaders.append('Set-Cookie', rewriteSetCookie(cookie, url.host));
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
