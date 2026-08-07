import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface LayoutApiResponse {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}

/** Short in-process TTL — nav/meta change rarely; cuts Payload on focus revalidate. */
const LAYOUT_TTL_MS = 60_000;

let cached: { data: LayoutApiResponse; expiresAt: number } | null = null;
let inflight: Promise<LayoutApiResponse> | null = null;

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

async function loadLayoutData(): Promise<LayoutApiResponse> {
	const now = Date.now();
	if (cached && cached.expiresAt > now) return cached.data;
	if (inflight) return inflight;

	inflight = Promise.all([fetchNavigationFromCMS(), fetchSiteMetaFromCMS()])
		.then(([navigation, siteMeta]) => {
			const data = { navigation, siteMeta } satisfies LayoutApiResponse;
			cached = { data, expiresAt: Date.now() + LAYOUT_TTL_MS };
			return data;
		})
		.finally(() => {
			inflight = null;
		});

	return inflight;
}

export const GET: RequestHandler = async () => {
	const data = await loadLayoutData();

	return json(data, {
		headers: {
			// Anonymous browsers / CDN may reuse briefly; IDB + TanStack own longer client cache.
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
		}
	});
};
