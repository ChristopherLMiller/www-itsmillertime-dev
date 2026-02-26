import type { PageLoad } from './$types';
import type { Project } from '$lib/types/payload-types';

/** Payload find response shape for projects collection */
interface ProjectsFindResponse {
	docs: Project[];
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

export const load: PageLoad = async ({ fetch, url }) => {
	const limit = Number(url.searchParams.get('limit')) || 50;
	const page = Number(url.searchParams.get('page')) || 1;

	const params = new URLSearchParams({
		endpoint: 'projects',
		limit: String(limit),
		page: String(page),
		sort: '-createdAt',
		depth: '2',
		'where[_status][not_equals]': 'draft'
	});

	const res = await fetch(`/api/payload?${params.toString()}`);

	if (!res.ok) {
		throw new Error(`Failed to fetch projects: ${res.status}`);
	}

	const data = (await res.json()) as ProjectsFindResponse;
	const { docs: projects, ...meta } = data;

	return { projects, meta };
};
