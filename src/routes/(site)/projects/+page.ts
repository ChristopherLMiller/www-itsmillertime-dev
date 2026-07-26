import type { PageLoad } from './$types';

/** Client-only so IndexedDB (persisted TanStack cache) is available for offline revisits. */
export const ssr = false;

export const load: PageLoad = ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 50;
	return { page, limit };
};
