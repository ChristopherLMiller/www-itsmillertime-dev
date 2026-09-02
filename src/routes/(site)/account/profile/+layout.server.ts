import { parseAuthSession } from '$lib/account/sessionView';
import { parseProfileUser } from '$lib/account/profileUser';
import { requireAccountSession } from '$lib/account/requireAccount.server';
import { fetchShopLinkStatus } from '$lib/account/shopLink.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = await requireAccountSession(event);
	return {
		profileUser: parseProfileUser(session.user),
		shopLink: await fetchShopLinkStatus(event),
		currentSession: parseAuthSession(session.session)
	};
};
