import {
	normalizeArticlesQuery,
	type ArticlesListCacheData,
	type ArticlesListPagination,
	type ArticlesListQuery
} from '$lib/cache/articleCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post, PostsCategory, PostsTag } from '$lib/types/payload-types';

export type ArticlesListLoadOptions = {
	/** When true, also include never-published drafts (admin preview). */
	includeDrafts?: boolean;
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

const LIST_SELECT = {
	publishedAt: true,
	slug: true,
	word_count: true,
	content: true,
	title: true,
	featuredImage: true,
	createdAt: true,
	updatedAt: true,
	originalPublicationDate: true,
	category: true,
	tags: true,
	_status: true,
	meta: {
		title: true,
		description: true,
		image: true
	}
} as const;

function buildTaxonomyFilters(category: string, tag: string) {
	return [
		...(category ? [{ 'category.slug': { equals: category } }] : []),
		...(tag ? [{ 'tags.slug': { equals: tag } }] : [])
	];
}

function articleSortValue(post: Post, sort: string): number | string {
	const field = sort.startsWith('-') ? sort.slice(1) : sort;
	// Payload may expose publishedAt on versioned posts even when generated types omit it.
	const publishedAt = (post as Post & { publishedAt?: string | null }).publishedAt;
	const raw =
		field === 'title'
			? (post.title ?? '')
			: field === 'createdAt'
				? post.createdAt
				: (publishedAt ?? post.originalPublicationDate ?? post.createdAt);

	if (field === 'title') return String(raw).toLowerCase();
	const time = Date.parse(String(raw));
	return Number.isFinite(time) ? time : 0;
}

function sortArticles(articles: Post[], sort: string): Post[] {
	const descending = sort.startsWith('-');
	return [...articles].sort((a, b) => {
		const av = articleSortValue(a, sort);
		const bv = articleSortValue(b, sort);
		if (av < bv) return descending ? 1 : -1;
		if (av > bv) return descending ? -1 : 1;
		return 0;
	});
}

function paginateArticles(
	articles: Post[],
	page: number,
	limit: number
): { articles: Post[]; pagination: ArticlesListPagination } {
	const totalDocs = articles.length;
	const totalPages = Math.max(1, Math.ceil(totalDocs / limit) || 1);
	const safePage = Math.min(Math.max(page, 1), totalPages);
	const start = (safePage - 1) * limit;
	const slice = articles.slice(start, start + limit);

	return {
		articles: slice,
		pagination: {
			totalDocs,
			limit,
			totalPages,
			page: safePage,
			pagingCounter: totalDocs === 0 ? 0 : start + 1,
			hasPrevPage: safePage > 1,
			hasNextPage: safePage < totalPages,
			prevPage: safePage > 1 ? safePage - 1 : null,
			nextPage: safePage < totalPages ? safePage + 1 : null
		}
	};
}

async function fetchArticlesListFromCMS(
	query: ArticlesListQuery,
	options: ArticlesListLoadOptions = {}
): Promise<ArticlesListCacheData> {
	const { includeDrafts = false, fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	const { page, limit, category, tag, sort } = query;
	const taxonomyFilters = buildTaxonomyFilters(category, tag);

	/**
	 * Important: do NOT use `draft: true` for the main published listing.
	 * Payload then returns each doc's newest draft version, so a published post
	 * with an empty autosave draft appears as a blank card for logged-in admins.
	 */
	const publishedPromise = sdk.find({
		collection: 'posts',
		limit: includeDrafts ? 100 : limit,
		page: includeDrafts ? 1 : page,
		sort,
		depth: 1,
		select: LIST_SELECT,
		where: {
			and: [{ _status: { equals: 'published' } }, ...taxonomyFilters] as never[]
		}
	});

	const draftOnlyPromise = includeDrafts
		? sdk.find({
				collection: 'posts',
				limit: 50,
				page: 1,
				sort,
				depth: 1,
				draft: true,
				select: LIST_SELECT,
				where: {
					and: [{ _status: { equals: 'draft' } }, ...taxonomyFilters] as never[]
				}
			})
		: null;

	const [publishedData, draftOnlyData, categoriesData, tagsData] = await Promise.all([
		publishedPromise,
		draftOnlyPromise,
		sdk.find({
			collection: 'posts-categories',
			limit: 100,
			sort: 'title'
		}),
		sdk.find({
			collection: 'posts-tags',
			limit: 100,
			sort: 'title'
		})
	]);

	let articles: Post[];
	let pagination: ArticlesListPagination;

	if (!includeDrafts || !draftOnlyData) {
		const { docs, ...meta } = publishedData;
		articles = docs as Post[];
		pagination = meta as ArticlesListPagination;
	} else {
		/**
		 * Payload `draft: true` + `_status: draft` can still return draft *versions*
		 * of published posts (those versions also report `_status: 'draft'`). Prefer
		 * the published doc whenever the same id exists in both result sets.
		 */
		const byId = new Map<number, Post>();
		for (const doc of publishedData.docs as Post[]) {
			if (doc.id == null) continue;
			byId.set(doc.id, { ...doc, _status: 'published' });
		}
		for (const doc of draftOnlyData.docs as Post[]) {
			if (doc.id == null || byId.has(doc.id)) continue;
			byId.set(doc.id, { ...doc, _status: 'draft' });
		}
		const merged = sortArticles([...byId.values()], sort);
		({ articles, pagination } = paginateArticles(merged, page, limit));
	}

	return {
		query,
		articles,
		pagination,
		categories: categoriesData.docs as PostsCategory[],
		tags: tagsData.docs as PostsTag[]
	};
}

export async function loadArticlesListPageData(
	pageRaw: number,
	limitRaw: number,
	categoryRaw?: string | null,
	tagRaw?: string | null,
	sortRaw?: string | null,
	options: ArticlesListLoadOptions = {}
): Promise<ArticlesListCacheData> {
	const query = normalizeArticlesQuery(pageRaw, limitRaw, categoryRaw, tagRaw, sortRaw);
	return fetchArticlesListFromCMS(query, options);
}
