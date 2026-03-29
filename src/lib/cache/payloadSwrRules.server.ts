/**
 * Server-only: Redis key rules for Payload REST GET SWR.
 * Add new resolvers to `payloadSwrKeyResolvers` (append); first match wins.
 */
import { cacheManager } from '$lib/cache/cache';
import type { PayloadSwrKeyContext, PayloadSwrKeyResolver } from '$lib/cache/payloadSwrCore';

function parseWhereSlugEquals(search: string): string | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const bracket = /(?:^|&)where\[slug\]\[equals\]=([^&]+)/.exec(q);
	if (bracket?.[1]) {
		try {
			return decodeURIComponent(bracket[1].replace(/\+/g, ' '));
		} catch {
			return bracket[1];
		}
	}
	const params = new URLSearchParams(q);
	const direct = params.get('where[slug][equals]');
	if (direct != null && direct !== '') return direct;
	return null;
}

function sortedQueryRecord(search: string): Record<string, string> | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(q);
	const out: Record<string, string> = {};
	const keys = Array.from(params.keys()).sort();
	for (const k of keys) {
		const v = params.get(k);
		if (v != null) out[k] = v;
	}
	return out;
}

function galleryAlbumBySlugFind(search: string): Record<string, string> | null {
	const q = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(q);
	const slug = parseWhereSlugEquals(`?${q}`);
	if (slug == null || slug === '') return null;
	if (params.get('limit') !== '1') return null;
	const page = params.get('page');
	if (page != null && page !== '1') return null;
	return sortedQueryRecord(search);
}

const galleryAlbumByIdPath: PayloadSwrKeyResolver = ({ pathname }) => {
	const m = pathname.match(/^\/gallery-albums\/([^/?#]+)\/?$/);
	if (!m) return null;
	return cacheManager.createKey(`gallery-album/${m[1]}`);
};

const galleryAlbumBySlugList: PayloadSwrKeyResolver = ({ pathname, search }) => {
	if (pathname !== '/gallery-albums' && pathname !== '/gallery-albums/') return null;
	const qp = galleryAlbumBySlugFind(search);
	if (!qp) return null;
	const slug = parseWhereSlugEquals(search);
	if (slug == null) return null;
	return cacheManager.createKey(`gallery-album/slug/${encodeURIComponent(slug)}`, qp);
};

/**
 * GET /gallery-images/:id (findByID). Cache key is id-only except depth=1 vs 0
 * (different populated shape).
 */
const galleryImageByIdPath: PayloadSwrKeyResolver = ({ pathname, search }) => {
	const m = pathname.match(/^\/gallery-images\/([^/?#]+)\/?$/);
	if (!m) return null;
	const id = m[1];
	const q = search.startsWith('?') ? search.slice(1) : search;
	const depth = new URLSearchParams(q).get('depth');
	if (depth === '1') {
		return cacheManager.createKey(`gallery-image/${id}`, { depth: '1' });
	}
	return cacheManager.createKey(`gallery-image/${id}`);
};

/**
 * Extend this array when adding new collections (e.g. posts by slug, models by id).
 * Order matters: first resolver that returns non-null wins.
 */
export const payloadSwrKeyResolvers: PayloadSwrKeyResolver[] = [
	galleryAlbumByIdPath,
	galleryAlbumBySlugList,
	galleryImageByIdPath
];
