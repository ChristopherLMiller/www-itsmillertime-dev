import { browser } from '$app/environment';
import type { LayoutLoad } from './$types';
import { getPayloadSDK } from '$lib/payload';

export const load: LayoutLoad = async ({ fetch }) => {
	const sdk = getPayloadSDK(fetch);
	const nav = await sdk.findGlobal({
		slug: 'site-navigation',
		depth: 1,
		draft: true
	});

	// Sort navItems by order ascending, and also sort childNodes if they exist
	const navigation = {
		...nav,
		navItems: nav.navItems
			? [...nav.navItems]
					.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
					.map((item) => ({
						...item,
						childNodes: item.childNodes
							? [...item.childNodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
							: item.childNodes
					}))
			: nav.navItems
	};

	const siteMeta = await sdk.findGlobal({
		slug: 'site-meta',
		depth: 1
	});

	return { navigation, siteMeta };
};
