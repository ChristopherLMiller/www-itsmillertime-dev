import type { Page } from '$lib/types/payload-types';

export type CmsPageMeta = NonNullable<Page['meta']> & {
	canonicalURL: string;
};

export interface CmsPageCacheData {
	slug: string;
	page: Page;
	meta: CmsPageMeta;
}

export function buildCmsPageDataUrl(slug: string): string {
	return `/api/pages/${encodeURIComponent(slug)}`;
}
