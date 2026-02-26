import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

/**
 * Proxies all /api/auth/* requests to the Payload CMS backend.
 * This avoids CORS issues since the browser only talks to the SvelteKit server.
 *
 * In dev mode, rewrites cookie names to strip the __Secure- prefix (which
 * browsers reject over plain HTTP) and restores it on outgoing requests
 * so the backend sees the original cookie names.
 */
const proxy: RequestHandler = async ({ request, params }) => {
	const targetUrl = `${PUBLIC_PAYLOAD_URL}/api/auth/${params.path}`;
	const url = new URL(request.url);
	const fullUrl = `${targetUrl}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete('accept-encoding');
	headers.delete('host');
	headers.set('origin', PUBLIC_PAYLOAD_URL);
	headers.set('referer', `${PUBLIC_PAYLOAD_URL}/`);

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

	const setCookies = response.headers.getSetCookie();
	for (const cookie of setCookies) {
		let rewritten = cookie
			.replace(/;\s*Domain=[^;]*/gi, '')
			.replace(/;\s*Path=[^;]*/gi, '')
			.concat('; Path=/');

		if (dev) {
			rewritten = rewritten.replace(/^__Secure-/i, '').replace(/^__Host-/i, '');
			rewritten = rewritten.replace(/;\s*Secure/gi, '');
			rewritten = rewritten.replace(/SameSite=None/gi, 'SameSite=Lax');
		}

		responseHeaders.append('Set-Cookie', rewritten);
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
