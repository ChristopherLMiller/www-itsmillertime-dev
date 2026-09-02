import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { cmsAccountLinkUrl } from '$lib/account/shopLink.server';
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
	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const res = await payloadFetch(cmsAccountLinkUrl('status'));
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(
			res.status,
			typeof data?.error === 'string' ? data.error : 'Could not load link status'
		);
	}
	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	await requireSession(event);
	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const res = await payloadFetch(cmsAccountLinkUrl('unlink'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{}'
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(
			res.status,
			typeof data?.error === 'string' ? data.error : 'Could not unlink shop account'
		);
	}
	return json(data);
};
