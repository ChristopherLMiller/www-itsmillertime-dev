import type { GalleryAlbum, GalleryCategory, GalleryTag } from '$lib/types/payload-types';

export const GALLERIES_LIST_DEFAULTS = {
	page: 1,
	limit: 15,
	category: '',
	tag: ''
} as const;

export type GalleriesListQuery = {
	page: number;
	limit: number;
	category: string;
	tag: string;
};

export interface GalleriesListPagination {
	totalDocs: number;
	limit: number;
	totalPages: number;
	page: number;
	pagingCounter: number;
	hasPrevPage: boolean;
	hasNextPage: boolean;
	prevPage: number | null;
	nextPage: number | null;
}

export interface GalleriesListCacheData {
	query: GalleriesListQuery;
	galleries: GalleryAlbum[];
	meta: GalleriesListPagination;
	categories: GalleryCategory[];
	tags: GalleryTag[];
}

export type GalleryAlbumImageDoc = {
	id: number;
	width?: number | null;
	height?: number | null;
	blurhash?: string | null;
	medusaProductId?: string | null;
	settings?: { isNsfw?: boolean | null };
};

export type GalleryAlbumImagesPage = {
	docs: GalleryAlbumImageDoc[];
	totalDocs: number;
	hasNextPage: boolean;
	nextPage: number | null;
	page: number;
	totalPages: number;
};

export type GalleryAlbumPageDoc = Omit<GalleryAlbum, 'images'> & {
	images: GalleryAlbumImagesPage;
};

export type GalleryAlbumPageMeta = {
	title: string;
	metaTitle: string;
	description?: string;
	metaDescription?: string;
	image: unknown;
	metaImage: unknown;
	canonicalURL: string;
};

export interface GalleryAlbumCacheData {
	slug: string;
	gallery: GalleryAlbumPageDoc;
	meta: GalleryAlbumPageMeta;
}

export function normalizeGalleriesQuery(
	pageRaw: number,
	limitRaw: number,
	categoryRaw?: string | null,
	tagRaw?: string | null
): GalleriesListQuery {
	const page =
		Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : GALLERIES_LIST_DEFAULTS.page;
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0
			? Math.min(100, Math.floor(limitRaw))
			: GALLERIES_LIST_DEFAULTS.limit;
	return {
		page,
		limit,
		category: categoryRaw?.trim() || GALLERIES_LIST_DEFAULTS.category,
		tag: tagRaw?.trim() || GALLERIES_LIST_DEFAULTS.tag
	};
}

export function galleriesListQueryFromUrl(url: URL): GalleriesListQuery {
	return normalizeGalleriesQuery(
		Number(url.searchParams.get('page')) || GALLERIES_LIST_DEFAULTS.page,
		Number(url.searchParams.get('limit')) || GALLERIES_LIST_DEFAULTS.limit,
		url.searchParams.get('category'),
		url.searchParams.get('tag')
	);
}

export function galleriesListQueriesMatch(a: GalleriesListQuery, b: GalleriesListQuery): boolean {
	return (
		a.page === b.page && a.limit === b.limit && a.category === b.category && a.tag === b.tag
	);
}

export function buildGalleriesDataUrl(query: GalleriesListQuery): string {
	const q = new URLSearchParams({
		page: String(query.page),
		limit: String(query.limit)
	});
	if (query.category) q.set('category', query.category);
	if (query.tag) q.set('tag', query.tag);
	return `/api/galleries-data?${q}`;
}
