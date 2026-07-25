import { cacheManager } from '$lib/cache/cache';
import {
	ARTICLE_CACHE_TTL_S,
	ARTICLE_STALE_THRESHOLD_S,
	articleRedisKey,
	type ArticlePageMeta,
	type ArticleRelatedModel
} from '$lib/cache/articleCache';
import { unwrapSwrCache, wrapForSwrCache } from '$lib/cache/payloadSwrCore';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post } from '$lib/types/payload-types';
import { toRelatedLinks } from '$lib/utils/relatedResources';

type CachedArticle = {
	data: Post;
	isStale: boolean;
};

function isPublishedArticle(article: Post | null | undefined): article is Post {
	return article?._status === 'published';
}

/** Cached articles may predate depth:1 fetches and only store related post IDs. */
function needsRelatedPostPopulation(article: Post): boolean {
	const posts = article.relatedPosts;
	if (!posts?.length) return false;
	return posts.some(
		(p) =>
			typeof p === 'number' ||
			(typeof p === 'object' && p != null && (!p.title || !p.slug))
	);
}

export function buildArticlePageMeta(doc: Post, origin: string, slug: string): ArticlePageMeta {
	return doc.meta
		? { ...doc.meta, canonicalURL: `${origin}/articles/${slug}` }
		: { canonicalURL: `${origin}/articles/${slug}` };
}

async function getCachedArticle(redisKey: string): Promise<CachedArticle | null> {
	const raw = await cacheManager.get(redisKey);
	const unwrapped = unwrapSwrCache(raw, ARTICLE_STALE_THRESHOLD_S);
	if (!unwrapped) return null;

	const article = unwrapped.data as Post;
	if (!isPublishedArticle(article)) return null;

	return {
		data: article,
		isStale: unwrapped.ageSeconds >= ARTICLE_STALE_THRESHOLD_S
	};
}

async function fetchArticleByIdFromCMS(articleId: number | string): Promise<Post | null> {
	const sdk = getPayloadSDK();
	return sdk.findByID({
		collection: 'posts',
		id: articleId,
		depth: 1,
		disableErrors: true
	});
}

/** Models that list this article under relatedResources.relatedPosts (CMS has no article→model field). */
async function fetchModelsRelatedToArticle(
	articleId: number | string
): Promise<ArticleRelatedModel[]> {
	const sdk = getPayloadSDK();
	const result = await sdk.find({
		collection: 'models',
		limit: 50,
		depth: 0,
		select: {
			id: true,
			title: true,
			slug: true
		},
		where: {
			'relatedResources.relatedPosts': {
				equals: articleId
			}
		}
	});

	return toRelatedLinks(result.docs);
}

async function resolvePublishedArticleId(slug: string): Promise<number | string | null> {
	const sdk = getPayloadSDK();
	const postLookup = await sdk.find({
		collection: 'posts',
		limit: 1,
		select: {
			id: true
		},
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					},
					slug: {
						equals: slug
					}
				}
			]
		}
	});

	if (postLookup.totalDocs === 0) return null;
	return postLookup.docs[0]?.id ?? null;
}

async function refreshArticleInBackground(
	articleId: number | string,
	redisKey: string
): Promise<void> {
	try {
		const article = await fetchArticleByIdFromCMS(articleId);
		if (isPublishedArticle(article)) {
			await cacheManager.set(redisKey, wrapForSwrCache(article), ARTICLE_CACHE_TTL_S);
		}
	} catch (err) {
		console.error('[article-cache] Background refresh failed:', err);
	}
}

export type ArticlePageDataResult = {
	article: Post;
	meta: ArticlePageMeta;
	relatedModels: ArticleRelatedModel[];
	cacheStatus: 'HIT' | 'MISS';
};

export async function loadArticlePageData(
	slug: string,
	origin: string
): Promise<ArticlePageDataResult | null> {
	const articleId = await resolvePublishedArticleId(slug);
	if (articleId == null) return null;

	const redisKey = cacheManager.createKey(articleRedisKey(articleId));
	const cachedArticle = await getCachedArticle(redisKey);

	let doc: Post;
	let cacheStatus: 'HIT' | 'MISS' = 'MISS';

	if (cachedArticle && !needsRelatedPostPopulation(cachedArticle.data)) {
		doc = cachedArticle.data;
		cacheStatus = 'HIT';
		if (cachedArticle.isStale) {
			refreshArticleInBackground(articleId, redisKey).catch(() => {});
		}
	} else {
		const freshArticle = await fetchArticleByIdFromCMS(articleId);
		if (!isPublishedArticle(freshArticle)) return null;
		doc = freshArticle;
		await cacheManager.set(redisKey, wrapForSwrCache(freshArticle), ARTICLE_CACHE_TTL_S);
	}

	const relatedModels = await fetchModelsRelatedToArticle(articleId);

	return {
		article: doc,
		meta: buildArticlePageMeta(doc, origin, slug),
		relatedModels,
		cacheStatus
	};
}
