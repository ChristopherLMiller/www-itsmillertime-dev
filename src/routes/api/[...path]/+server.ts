import { dev } from '$app/environment';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { error, type RequestHandler } from '@sveltejs/kit';

/** Match createPayloadFetch: CMS expects __Secure-better-auth.* in local HTTP dev. */
function cookiesForPayload(cookieHeader: string | null): string {
	if (!cookieHeader) return '';
	if (!dev) return cookieHeader;
	return cookieHeader
		.split('; ')
		.map((c) => (c.startsWith('better-auth.') ? '__Secure-' + c : c))
		.join('; ');
}

const proxyRequest = async (request: Request, path: string): Promise<Response> => {
	const url = `${getPayloadApiBaseUrl()}/${path}${new URL(request.url).search}`;

	const headers = new Headers();
	const contentType = request.headers.get('content-type');
	if (contentType) headers.set('content-type', contentType);
	headers.set('cookie', cookiesForPayload(request.headers.get('cookie')));
	headers.set('accept', request.headers.get('accept') ?? 'application/json');

	const response = await fetch(url, {
		method: request.method,
		headers,
		...(request.method !== 'GET' && request.method !== 'HEAD' ? { body: await request.text() } : {})
	});

	const outHeaders = new Headers({
		'content-type': response.headers.get('content-type') ?? 'application/json'
	});

	for (const cookie of response.headers.getSetCookie()) {
		outHeaders.append('set-cookie', cookie);
	}

	return new Response(await response.text(), {
		status: response.status,
		headers: outHeaders
	});
};

const handle: RequestHandler = ({ request, params }) => {
	const path = params.path;
	if (path === undefined) {
		error(404);
	}
	return proxyRequest(request, path);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
