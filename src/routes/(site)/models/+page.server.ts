import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { PageServerLoad } from './$types';
import { normalizeModelSort, normalizeModelStatus } from './filters';

export const load: PageServerLoad = async (event) => {
	const { fetch, request, url } = event;
	const sdk = getPayloadSDK(fetch, request);

	const manufacturer = url.searchParams.get('manufacturer')?.trim() || '';
	const scale = url.searchParams.get('scale')?.trim() || '';
	const tag =
		url.searchParams.get('tag')?.trim() || url.searchParams.get('tags')?.trim() || '';
	const status = normalizeModelStatus(url.searchParams.get('status'));
	const sort = normalizeModelSort(url.searchParams.get('sort'));
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 15;

	const user = await getMergedSessionUser(event);
	const isAdmin = isAdminRole(user);

	// Non-admins cannot filter to NOT_STARTED (hidden from public listings).
	const effectiveStatus = !isAdmin && status === 'NOT_STARTED' ? null : status;
	const forceEmpty = !isAdmin && status === 'NOT_STARTED';

	const andFilters = [
		...(manufacturer
			? [{ 'model_meta.kit.manufacturer.slug': { equals: manufacturer } }]
			: []),
		...(scale ? [{ 'model_meta.kit.scale.slug': { equals: scale } }] : []),
		...(effectiveStatus
			? [{ 'model_meta.status': { equals: effectiveStatus } }]
			: isAdmin
				? []
				: [{ 'model_meta.status': { not_equals: 'NOT_STARTED' } }]),
		...(tag ? [{ 'model_meta.tags.slug': { equals: tag } }] : [])
	];

	const [modelsData, manufacturersData, scalesData, tagsData] = await Promise.all([
		forceEmpty
			? Promise.resolve({
					docs: [],
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
		models,
		meta,
		manufacturers: manufacturersData.docs,
		scales: scalesData.docs,
		tags: tagsData.docs,
		isAdmin
	};
};
