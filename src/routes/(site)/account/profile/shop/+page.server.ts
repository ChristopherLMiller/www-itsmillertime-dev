import { fetchShopOrders } from '$lib/account/shopLink.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { shopLink } = await event.parent();
	if (!shopLink.linked) {
		return { orders: [], ordersError: null as string | null };
	}
	const result = await fetchShopOrders(event);
	return { orders: result.orders, ordersError: result.error };
};
