import type { CmsPageCacheData, CmsPageMeta } from '$lib/cache/pageCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Page } from '$lib/types/payload-types';

export type CmsPageLoadOptions = {
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

function buildMeta(doc: Page, canonicalURL: string): CmsPageMeta {
	return doc.meta ? { ...doc.meta, canonicalURL } : { canonicalURL };
}

export async function loadCmsPageData(
	slug: string,
	canonicalURL: string,
	options: CmsPageLoadOptions = {}
): Promise<CmsPageCacheData | null> {
	const { fetch, request } = options;
	const pageData = await getPayloadSDK(fetch, request).find({
		collection: 'pages',
		depth: 1,
		select: {
			blocks: true,
			meta: true
		},
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					}
				},
				{
					slug: {
						equals: slug
					}
				}
			]
		}
	});

	if (pageData.totalDocs === 0) return null;

	const doc = pageData.docs[0];
	return {
		slug,
		page: doc as Page,
		meta: buildMeta(doc as Page, canonicalURL)
	};
}
