import type { PageLoad } from './$types';

/** Client-only so IndexedDB (persisted TanStack cache) is available for offline revisits. */
export const ssr = false;

export const load: PageLoad = ({ params }) => {
	return { slug: params.slug };
};
