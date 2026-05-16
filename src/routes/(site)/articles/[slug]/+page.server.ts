import { getPayloadSDK } from '$lib/payload.server';
import { cacheManager } from '$lib/cache/cache';
import type { Post } from '$lib/types/payload-types';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const ARTICLE_CACHE_STALE_THRESHOLD_S = 300; // 5 minutes

async function fetchArticleByIdFromCMS(articleId: number | string): Promise<Post | null> {
	const sdk = getPayloadSDK();
	return sdk.findByID({
		collection: 'posts',
		id: articleId,
		disableErrors: true
	});
}

async function refreshArticleInBackground(articleId: number | string, cacheKey: string): Promise<void> {
	try {
		const article = await fetchArticleByIdFromCMS(articleId);
		if (article) {
			await cacheManager.set(cacheKey, article);
		}
	} catch (err) {
		console.error('[article-cache] Background refresh failed:', err);
	}
}

export const load: PageServerLoad = async ({ fetch, url, params, request }) => {
	const sdk = getPayloadSDK(fetch, request);
	const slug = params.slug;

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

	if (postLookup.totalDocs === 0) {
		throw error(404, 'Article not found');
	}

	const articleId = postLookup.docs[0]?.id;
	if (articleId == null) {
		throw error(500, 'Article lookup missing id');
	}

	const articleCacheKey = cacheManager.createKey(`article:${articleId}`);
	const cachedArticle = (await cacheManager.get(articleCacheKey)) as Post | null;

	let doc: Post;
	if (cachedArticle) {
		doc = cachedArticle;
		const isStale = await cacheManager.isCacheStale(articleCacheKey, ARTICLE_CACHE_STALE_THRESHOLD_S);
		if (isStale) {
			refreshArticleInBackground(articleId, articleCacheKey).catch(() => {});
		}
	} else {
		const freshArticle = await fetchArticleByIdFromCMS(articleId);
		if (!freshArticle) {
			throw error(404, 'Article not found');
		}
		doc = freshArticle;
		await cacheManager.set(articleCacheKey, doc);
	}

	const meta = doc.meta
		? { ...doc.meta, canonicalURL: `${url.origin}/articles/${slug}` }
		: { canonicalURL: `${url.origin}/articles/${slug}` };

	return {
		article: doc,
		meta
	};
};
