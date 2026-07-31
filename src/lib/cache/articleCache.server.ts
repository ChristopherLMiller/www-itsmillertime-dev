import type { ArticlePageMeta, ArticleRelatedModel } from '$lib/cache/articleCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post } from '$lib/types/payload-types';
import { toRelatedLinks } from '$lib/utils/relatedResources';

export type ArticlePageLoadOptions = {
	/** When true, allow draft posts (admin preview). Requires auth cookies via fetch/request. */
	includeDrafts?: boolean;
	fetch?: typeof globalThis.fetch;
	request?: Request;
};

function isReadableArticle(
	article: Post | null | undefined,
	includeDrafts: boolean
): article is Post {
	if (!article) return false;
	if (includeDrafts) return true;
	return article._status === 'published';
}

export function buildArticlePageMeta(doc: Post, origin: string, slug: string): ArticlePageMeta {
	return doc.meta
		? { ...doc.meta, canonicalURL: `${origin}/articles/${slug}` }
		: { canonicalURL: `${origin}/articles/${slug}` };
}

async function fetchArticleByIdFromCMS(
	articleId: number | string,
	options: ArticlePageLoadOptions = {}
): Promise<Post | null> {
	const { includeDrafts = false, fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	return sdk.findByID({
		collection: 'posts',
		id: articleId,
		depth: 1,
		disableErrors: true,
		...(includeDrafts ? { draft: true } : {})
	});
}

/** Models that list this article under relatedResources.relatedPosts (CMS has no article→model field). */
async function fetchModelsRelatedToArticle(
	articleId: number | string,
	options: ArticlePageLoadOptions = {}
): Promise<ArticleRelatedModel[]> {
	const { fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
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

async function resolveArticleId(
	slug: string,
	options: ArticlePageLoadOptions = {}
): Promise<number | string | null> {
	const { includeDrafts = false, fetch, request } = options;
	const sdk = getPayloadSDK(fetch, request);
	const postLookup = await sdk.find({
		collection: 'posts',
		limit: 1,
		select: {
			id: true
		},
		...(includeDrafts ? { draft: true } : {}),
		where: {
			and: [
				...(includeDrafts
					? []
					: [
							{
								_status: {
									equals: 'published'
								}
							}
						]),
				{
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

export type ArticlePageDataResult = {
	article: Post;
	meta: ArticlePageMeta;
	relatedModels: ArticleRelatedModel[];
};

export async function loadArticlePageData(
	slug: string,
	origin: string,
	options: ArticlePageLoadOptions = {}
): Promise<ArticlePageDataResult | null> {
	const includeDrafts = options.includeDrafts === true;
	const articleId = await resolveArticleId(slug, options);
	if (articleId == null) return null;

	const doc = await fetchArticleByIdFromCMS(articleId, options);
	if (!isReadableArticle(doc, includeDrafts)) return null;

	const relatedModels = await fetchModelsRelatedToArticle(articleId, options);

	return {
		article: doc,
		meta: buildArticlePageMeta(doc, origin, slug),
		relatedModels
	};
}
