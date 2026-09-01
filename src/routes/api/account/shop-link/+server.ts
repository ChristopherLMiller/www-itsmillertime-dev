import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function requireSession(event: Parameters<RequestHandler>[0]) {
	const session = await loadSessionFromEvent(event);
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}
	return session;
}

export const GET: RequestHandler = async (event) => {
	await requireSession(event);
	const payloadFetch = createPayloadFetch(event.fetch);
	const res = await payloadFetch(`${getPayloadApiBaseUrl()}/api/account-link/shop/status`);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(res.status, typeof data?.error === 'string' ? data.error : 'Could not load link status');
	}
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	await requireSession(event);
	const payloadFetch = createPayloadFetch(event.fetch);
	const res = await payloadFetch(`${getPayloadApiBaseUrl()}/api/account-link/shop/unlink`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{}',
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(res.status, typeof data?.error === 'string' ? data.error : 'Could not unlink shop account');
	}
	return json(data);
};
