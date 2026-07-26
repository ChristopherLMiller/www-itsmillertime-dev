import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';

export interface LayoutCacheData {
	navigation: SiteNavigation;
	siteMeta: SiteMeta;
}
