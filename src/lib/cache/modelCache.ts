import {
	DEFAULT_MODEL_SORT,
	normalizeModelSort,
	normalizeModelStatus,
	type ModelStatus
} from '$lib/models/filters';
import type { Manufacturer, Model, ModelsTag, Scale } from '$lib/types/payload-types';

/** Default query parameters applied when URL params are omitted. */
export const MODELS_LIST_DEFAULTS = {
	sort: DEFAULT_MODEL_SORT,
	page: 1,
	limit: 15,
	manufacturer: '',
	scale: '',
	tag: '',
	status: null as ModelStatus | null
} as const;

export type ModelsListQuery = {
	sort: string;
	page: number;
	limit: number;
	manufacturer: string;
	scale: string;
	tag: string;
	status: ModelStatus | null;
};

export type ModelPageMeta = NonNullable<Model['meta']> & {
	canonicalURL: string;
};

export interface ModelsListPagination {
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

export interface ModelsListCacheData {
	/** Normalized query this payload was fetched with (defaults applied). */
	query: ModelsListQuery;
	models: Model[];
	meta: ModelsListPagination;
	manufacturers: Manufacturer[];
	scales: Scale[];
	tags: ModelsTag[];
}

export interface ModelCacheData {
	model: Model;
	meta: ModelPageMeta;
}

export function normalizeModelsQuery(
	pageRaw: number,
	limitRaw: number,
	manufacturerRaw?: string | null,
	scaleRaw?: string | null,
	tagRaw?: string | null,
	statusRaw?: string | null,
	sortRaw?: string | null
): ModelsListQuery {
	const page =
		Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : MODELS_LIST_DEFAULTS.page;
	const limit =
		Number.isFinite(limitRaw) && limitRaw > 0
			? Math.min(100, Math.floor(limitRaw))
			: MODELS_LIST_DEFAULTS.limit;
	return {
		page,
		limit,
		manufacturer: manufacturerRaw?.trim() || MODELS_LIST_DEFAULTS.manufacturer,
		scale: scaleRaw?.trim() || MODELS_LIST_DEFAULTS.scale,
		tag: tagRaw?.trim() || MODELS_LIST_DEFAULTS.tag,
		status: normalizeModelStatus(statusRaw ?? null),
		sort: normalizeModelSort(sortRaw ?? null)
	};
}

export function modelsListQueryFromUrl(url: URL): ModelsListQuery {
	return normalizeModelsQuery(
		Number(url.searchParams.get('page')) || MODELS_LIST_DEFAULTS.page,
		Number(url.searchParams.get('limit')) || MODELS_LIST_DEFAULTS.limit,
		url.searchParams.get('manufacturer'),
		url.searchParams.get('scale'),
		url.searchParams.get('tag') || url.searchParams.get('tags'),
		url.searchParams.get('status'),
		url.searchParams.get('sort')
	);
}

export function buildModelsDataUrl(query: ModelsListQuery): string {
	const q = new URLSearchParams({
		page: String(query.page),
		limit: String(query.limit),
		sort: query.sort
	});
	if (query.manufacturer) q.set('manufacturer', query.manufacturer);
	if (query.scale) q.set('scale', query.scale);
	if (query.tag) q.set('tag', query.tag);
	if (query.status) q.set('status', query.status);
	return `/api/models-data?${q}`;
}
