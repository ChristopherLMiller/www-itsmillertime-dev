import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { cmsAccountLinkUrl } from '$lib/account/shopLink.server';
import { createPayloadFetch } from '$lib/payload';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const session = await loadSessionFromEvent(event);
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const body = await event.request.json().catch(() => null);
	const challengeId =
		body &&
		typeof body === 'object' &&
		typeof (body as { challenge_id?: unknown }).challenge_id === 'string'
			? (body as { challenge_id: string }).challenge_id
			: '';
	const code =
		body && typeof body === 'object' && typeof (body as { code?: unknown }).code === 'string'
			? (body as { code: string }).code.trim()
			: '';

	if (!challengeId || !code) {
		throw error(400, 'challenge_id and code are required');
	}

	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const res = await payloadFetch(cmsAccountLinkUrl('confirm'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ challenge_id: challengeId, code })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(
			res.status,
			typeof data?.error === 'string' ? data.error : 'Could not confirm shop linking'
		);
	}
	return json(data);
};
