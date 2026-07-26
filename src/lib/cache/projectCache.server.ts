import {
	normalizeProjectsQuery,
	type ProjectsCacheData,
	type ProjectsListMeta
} from '$lib/cache/projectCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Project } from '$lib/types/payload-types';

async function fetchProjectsFromCMS(page: number, limit: number): Promise<ProjectsCacheData> {
	const sdk = getPayloadSDK();
	const { docs: projects, ...meta } = await sdk.find({
		collection: 'projects',
		limit,
		page,
		sort: '-createdAt',
		depth: 2,
		where: {
			_status: { not_equals: 'draft' }
		}
	});

	return {
		projects: projects as Project[],
		meta: meta as ProjectsListMeta
	};
}

export type ProjectsPageDataResult = ProjectsCacheData & {
	page: number;
	limit: number;
};

export async function loadProjectsPageData(
	pageRaw: number,
	limitRaw: number
): Promise<ProjectsPageDataResult> {
	const { page, limit } = normalizeProjectsQuery(pageRaw, limitRaw);
	const payload = await fetchProjectsFromCMS(page, limit);

	return {
		...payload,
		page,
		limit
	};
}
