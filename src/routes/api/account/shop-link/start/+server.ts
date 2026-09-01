import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const session = await loadSessionFromEvent(event);
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await event.request.json().catch(() => null);
	const email =
		body && typeof body === 'object' && typeof (body as { email?: unknown }).email === 'string'
			? (body as { email: string }).email.trim()
			: '';

	if (!email) {
		throw error(400, 'Shop account email is required');
	}

	const payloadFetch = createPayloadFetch(event.fetch);
	const res = await payloadFetch(`${getPayloadApiBaseUrl()}/api/account-link/shop/start`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(res.status, typeof data?.error === 'string' ? data.error : 'Could not start shop linking');
	}
	return json(data, { status: 201 });
};
