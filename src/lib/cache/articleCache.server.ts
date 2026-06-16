import { cacheManager } from '$lib/cache/cache';
import {
	ARTICLE_CACHE_TTL_S,
	ARTICLE_STALE_THRESHOLD_S,
	articleRedisKey,
	type ArticlePageMeta
} from '$lib/cache/articleCache';
import { unwrapSwrCache, wrapForSwrCache } from '$lib/cache/payloadSwrCore';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post } from '$lib/types/payload-types';

type CachedArticle = {
	data: Post;
	isStale: boolean;
};

function isPublishedArticle(article: Post | null | undefined): article is Post {
	return article?._status === 'published';
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
		disableErrors: true
	});
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

	if (cachedArticle) {
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

	return {
		article: doc,
		meta: buildArticlePageMeta(doc, origin, slug),
		cacheStatus
	};
}
