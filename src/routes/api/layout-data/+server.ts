import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface LayoutApiResponse {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}

async function fetchNavigationFromCMS(): Promise<SiteNavigation> {
	const sdk = getPayloadSDK();

	const nav = await sdk.findGlobal({ slug: 'site-navigation', depth: 1, draft: true });

	const navItems = nav.navItems
		? [...nav.navItems]
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
				.map((item) => ({
					...item,
					childNodes: item.childNodes
						? [...item.childNodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
						: item.childNodes
				}))
		: nav.navItems;

	return { ...nav, navItems };
}

async function fetchSiteMetaFromCMS(): Promise<SiteMeta> {
	const sdk = getPayloadSDK();
	return sdk.findGlobal({ slug: 'site-meta', depth: 1 });
}

export const GET: RequestHandler = async () => {
	const [navigation, siteMeta] = await Promise.all([
		fetchNavigationFromCMS(),
		fetchSiteMetaFromCMS()
	]);

	return json({ navigation, siteMeta } satisfies LayoutApiResponse);
};
