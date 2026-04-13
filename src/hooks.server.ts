import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const ip = event.getClientAddress();
	const method = event.request.method;
	const path = event.url.pathname;

	const response = await resolve(event);

	const duration = Date.now() - start;
	console.log(`[${new Date().toISOString()}] ${ip} ${method} ${path} ${response.status} ${duration}ms`);

	return response;
};
