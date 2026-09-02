import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { cmsAccountLinkUrl } from '$lib/account/shopLink.server';
import { parseShopOrders } from '$lib/account/shopLink';
import { createPayloadFetch } from '$lib/payload';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const session = await loadSessionFromEvent(event);
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}
	const payloadFetch = createPayloadFetch(event.fetch, event.request);
	const res = await payloadFetch(cmsAccountLinkUrl('orders'));
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw error(
			res.status,
			typeof data?.error === 'string'
				? data.error
				: typeof data?.message === 'string'
					? data.message
					: 'Could not load shop orders'
		);
	}
	return json({ orders: parseShopOrders(data) });
};
