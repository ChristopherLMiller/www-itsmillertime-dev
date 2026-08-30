import { canAccessAdmin, getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { createPayloadFetch } from '$lib/payload';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!canAccessAdmin(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const template = event.url.searchParams.get('template')?.trim() ?? '';
	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const base = getPayloadApiBaseUrl();
	const url = template
		? `${base}/email-preview?template=${encodeURIComponent(template)}`
		: `${base}/email-preview`;

	const res = await payloadFetch(url, { headers: { Accept: 'application/json' } });
	const body = await res.json().catch(() => ({}));
	return json(body, { status: res.status });
};
