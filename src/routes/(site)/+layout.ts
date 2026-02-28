import type { LayoutLoad } from './$types';
import { getPayloadSDK } from '$lib/payload';

export const load: LayoutLoad = async ({ fetch, data }) => {
	const sdk = getPayloadSDK(fetch);

	const [nav, siteMeta] = await Promise.all([
		sdk.findGlobal({
			slug: 'site-navigation',
			depth: 1,
			draft: true
		}),
		sdk.findGlobal({
			slug: 'site-meta',
			depth: 1
		})
	]);

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

	return { navigation, siteMeta, session: data.session };
};
