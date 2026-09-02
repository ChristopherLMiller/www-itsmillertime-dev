import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import type { RequestEvent } from '@sveltejs/kit';
import {
	CMS_ACCOUNT_LINK,
	emptyShopLinkStatus,
	parseShopLinkStatus,
	parseShopOrders,
	type ShopOrderView
} from './shopLink';
import type { ShopLinkStatus } from './types';

export async function fetchShopLinkStatus(event: RequestEvent): Promise<ShopLinkStatus> {
	try {
		const payloadFetch = createPayloadFetch(event.fetch, event.request);
		const res = await payloadFetch(`${getPayloadApiBaseUrl()}${CMS_ACCOUNT_LINK.status}`);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			return emptyShopLinkStatus(
				typeof data?.error === 'string'
					? data.error
					: typeof data?.message === 'string'
						? data.message
						: 'Could not load shop link status.'
			);
		}
		return parseShopLinkStatus(data);
	} catch (err) {
		return emptyShopLinkStatus(
			err instanceof Error ? err.message : 'Could not load shop link status.'
		);
	}
}

export async function fetchShopOrders(
	event: RequestEvent
): Promise<{ orders: ShopOrderView[]; error: string | null }> {
	try {
		const payloadFetch = createPayloadFetch(event.fetch, event.request);
		const res = await payloadFetch(`${getPayloadApiBaseUrl()}${CMS_ACCOUNT_LINK.orders}`);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			return {
				orders: [],
				error:
					typeof data?.error === 'string'
						? data.error
						: typeof data?.message === 'string'
							? data.message
							: 'Could not load shop orders.'
			};
		}
		return { orders: parseShopOrders(data), error: null };
	} catch (err) {
		return {
			orders: [],
			error: err instanceof Error ? err.message : 'Could not load shop orders.'
		};
	}
}

export function cmsAccountLinkUrl(action: keyof typeof CMS_ACCOUNT_LINK): string {
	return `${getPayloadApiBaseUrl()}${CMS_ACCOUNT_LINK[action]}`;
}
