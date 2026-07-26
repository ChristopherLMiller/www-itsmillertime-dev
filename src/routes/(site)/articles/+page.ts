import { articlesListQueryFromUrl } from '$lib/cache/articleCache';
import type { PageLoad } from './$types';

/** Client-only so IndexedDB (persisted TanStack cache) is available for offline revisits. */
export const ssr = false;

export const load: PageLoad = ({ url }) => {
	return { query: articlesListQueryFromUrl(url) };
};
