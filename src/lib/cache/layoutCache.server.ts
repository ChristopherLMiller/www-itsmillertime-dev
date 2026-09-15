import type { LayoutCacheData } from '$lib/cache/layoutCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';

/** Short in-process TTL — nav/meta change rarely; cuts Payload on focus revalidate. */
const LAYOUT_TTL_MS = 60_000;

let cached: { data: LayoutCacheData; expiresAt: number } | null = null;
let inflight: Promise<LayoutCacheData> | null = null;

async function fetchNavigationFromCMS(): Promise<SiteNavigation> {
	const sdk = getPayloadSDK();

	const nav = await sdk.findGlobal({
		slug: 'site-navigation',
		depth: 1,
		draft: true,
		select: { navItems: true }
	});

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
	return sdk.findGlobal({
		slug: 'site-meta',
		depth: 0,
		select: { siteMeta: true }
	});
}

export function invalidateLayoutServerCache(): void {
	cached = null;
	inflight = null;
}

export async function loadLayoutData(): Promise<LayoutCacheData> {
	const now = Date.now();
	if (cached && cached.expiresAt > now) return cached.data;
	if (inflight) return inflight;

	inflight = Promise.all([fetchNavigationFromCMS(), fetchSiteMetaFromCMS()])
		.then(([navigation, siteMeta]) => {
			const data = { navigation, siteMeta } satisfies LayoutCacheData;
			cached = { data, expiresAt: Date.now() + LAYOUT_TTL_MS };
			return data;
		})
		.finally(() => {
			inflight = null;
		});

	return inflight;
}
