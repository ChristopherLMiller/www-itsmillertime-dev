import type { Garden } from '$lib/types/payload-types';

export interface GardensListCacheData {
	gardens: Garden[];
}

export type GardenPageMeta = NonNullable<Garden['meta']> & {
	canonicalURL: string;
};

export interface GardenCacheData {
	slug: string;
	garden: Garden;
	meta: GardenPageMeta;
}
