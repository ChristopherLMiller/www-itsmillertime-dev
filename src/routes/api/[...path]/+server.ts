import { PAYLOAD_INTERNAL_URL } from '$env/static/private';
import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { error, type RequestHandler } from '@sveltejs/kit';

const proxyRequest = async (request: Request, path: string): Promise<Response> => {
	const url = `${PAYLOAD_INTERNAL_URL}/${path}${new URL(request.url).search}`;

	const response = await fetch(url, {
		method: request.method,
		headers: {
			cookie: request.headers.get('cookie') ?? '',
			'content-type': request.headers.get('content-type') ?? 'application/json'
		},
		...(request.method !== 'GET' && request.method !== 'HEAD' ? { body: await request.text() } : {})
	});

	const headers = new Headers({
		'content-type': response.headers.get('content-type') ?? 'application/json'
	});

	// Forward any set-cookie headers so auth cookies reach the browser
	const setCookie = response.headers.get('set-cookie');
	if (setCookie) {
		headers.set('set-cookie', setCookie);
	}

	return new Response(await response.text(), {
		status: response.status,
		headers
	});
};

const handle: RequestHandler = ({ request, params }) => {
	const path = params.path;
	console.log('path', path);
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
