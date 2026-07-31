import {
	type ModelCacheData,
	type ModelPageMeta,
	type ModelsListCacheData,
	type ModelsListPagination,
	type ModelsListQuery
} from '$lib/cache/modelCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Manufacturer, Model, ModelsTag, Scale } from '$lib/types/payload-types';

export type ModelsLoadOptions = {
	/** When true, include NOT_STARTED models (admin preview). Requires auth cookies via fetch/request. */
	includeNotStarted?: boolean;
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

async function fetchModelsListFromCMS(
	query: ModelsListQuery,
	options: ModelsLoadOptions = {}
): Promise<ModelsListCacheData> {
	const { includeNotStarted = false, fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	const { page, limit, manufacturer, scale, tag, status, sort } = query;

	// Non-admins cannot filter to NOT_STARTED (hidden from public listings).
	const effectiveStatus = !includeNotStarted && status === 'NOT_STARTED' ? null : status;
	const forceEmpty = !includeNotStarted && status === 'NOT_STARTED';

	const andFilters = [
		...(manufacturer
			? [{ 'model_meta.kit.manufacturer.slug': { equals: manufacturer } }]
			: []),
		...(scale ? [{ 'model_meta.kit.scale.slug': { equals: scale } }] : []),
		...(effectiveStatus
			? [{ 'model_meta.status': { equals: effectiveStatus } }]
			: includeNotStarted
				? []
				: [{ 'model_meta.status': { not_equals: 'NOT_STARTED' } }]),
		...(tag ? [{ 'model_meta.tags.slug': { equals: tag } }] : [])
	];

	const [modelsData, manufacturersData, scalesData, tagsData] = await Promise.all([
		forceEmpty
			? Promise.resolve({
					docs: [] as Model[],
					totalDocs: 0,
					limit,
					totalPages: 0,
					page,
					pagingCounter: 0,
					hasPrevPage: false,
					hasNextPage: false,
					prevPage: null,
					nextPage: null
				})
			: sdk.find({
					collection: 'models',
					sort,
					limit,
					page,
					depth: 2,
					select: {
						id: true,
						title: true,
						createdAt: true,
						updatedAt: true,
						slug: true,
						model_meta: true,
						clockify_project: true
					},
					...(andFilters.length > 0
						? {
								where: {
									and: andFilters as never[]
								}
							}
						: {})
				}),
		sdk.find({
			collection: 'manufacturers',
			limit: 100,
			sort: 'title',
			select: { id: true, slug: true, title: true }
		}),
		sdk.find({
			collection: 'scales',
			limit: 100,
			sort: 'title',
			select: { id: true, slug: true, title: true }
		}),
		sdk.find({
			collection: 'models-tags',
			limit: 100,
			sort: 'title',
			select: { id: true, slug: true, title: true }
		})
	]);

	const { docs: models, ...meta } = modelsData;

	return {
		query,
		models: models as Model[],
		meta: meta as ModelsListPagination,
		manufacturers: manufacturersData.docs as Manufacturer[],
		scales: scalesData.docs as Scale[],
		tags: tagsData.docs as ModelsTag[]
	};
}

export async function loadModelsListPageData(
	query: ModelsListQuery,
	options: ModelsLoadOptions = {}
): Promise<ModelsListCacheData> {
	return fetchModelsListFromCMS(query, options);
}

export function buildModelPageMeta(doc: Model, origin: string, slug: string): ModelPageMeta {
	return doc.meta
		? { ...doc.meta, canonicalURL: `${origin}/models/${slug}` }
		: { canonicalURL: `${origin}/models/${slug}` };
}

async function fetchModelBySlugFromCMS(
	slug: string,
	options: ModelsLoadOptions = {}
): Promise<Model | null> {
	const { fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	const modelData = await sdk.find({
		collection: 'models',
		depth: 2,
		where: {
			slug: {
				equals: slug
			}
		},
		select: {
			id: true,
			title: true,
			createdAt: true,
			updatedAt: true,
			slug: true,
			model_meta: true,
			clockify_project: true,
			buildLog: true,
			image: true,
			meta: true,
			relatedPosts: true,
			relatedResources: true
		}
	});

	return (modelData.docs[0] as Model | undefined) ?? null;
}

function isReadableModel(model: Model | null, includeNotStarted: boolean): model is Model {
	if (!model) return false;
	if (includeNotStarted) return true;
	return model.model_meta?.status !== 'NOT_STARTED';
}

export async function loadModelPageData(
	slug: string,
	origin: string,
	options: ModelsLoadOptions = {}
): Promise<ModelCacheData | null> {
	const includeNotStarted = options.includeNotStarted === true;
	const doc = await fetchModelBySlugFromCMS(slug, options);
	if (!isReadableModel(doc, includeNotStarted)) return null;

	return {
		model: doc,
		meta: buildModelPageMeta(doc, origin, slug)
	};
}
