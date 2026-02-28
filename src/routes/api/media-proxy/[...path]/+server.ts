import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

/**
 * Proxies media requests to Payload CMS with the user's auth cookies forwarded.
 * Used for restricted/NSFW images that require authentication to access.
 * Public images should be loaded directly from the CMS to avoid unnecessary latency.
 */
const proxy: RequestHandler = async ({ request, params }) => {
	const targetUrl = `${PUBLIC_PAYLOAD_URL}/${params.path}`;

	const headers = new Headers();
	headers.set('accept', request.headers.get('accept') ?? '*/*');

	const cookieHeader = request.headers.get('cookie');
	if (cookieHeader) {
		let cookies = cookieHeader;
		if (dev) {
			cookies = cookies
				.split('; ')
				.map((c) => (c.startsWith('better-auth.') ? '__Secure-' + c : c))
				.join('; ');
		}
		headers.set('cookie', cookies);
	}

	const response = await fetch(targetUrl, {
		method: 'GET',
		headers,
		redirect: 'follow'
	});

	if (!response.ok) {
		return new Response(null, { status: response.status, statusText: response.statusText });
	}

	const responseHeaders = new Headers();
	const contentType = response.headers.get('content-type');
	if (contentType) responseHeaders.set('content-type', contentType);

	const contentLength = response.headers.get('content-length');
	if (contentLength) responseHeaders.set('content-length', contentLength);

	responseHeaders.set('cache-control', 'public, max-age=31536000, immutable');

	const body = await response.arrayBuffer();
	return new Response(body, { status: 200, headers: responseHeaders });
};

export const GET = proxy;
