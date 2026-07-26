import type { ArticlePageMeta, ArticleRelatedModel } from '$lib/cache/articleCache';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { Post } from '$lib/types/payload-types';
import { toRelatedLinks } from '$lib/utils/relatedResources';

function isPublishedArticle(article: Post | null | undefined): article is Post {
	return article?._status === 'published';
}

export function buildArticlePageMeta(doc: Post, origin: string, slug: string): ArticlePageMeta {
	return doc.meta
		? { ...doc.meta, canonicalURL: `${origin}/articles/${slug}` }
		: { canonicalURL: `${origin}/articles/${slug}` };
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

export type ArticlePageDataResult = {
	article: Post;
	meta: ArticlePageMeta;
	relatedModels: ArticleRelatedModel[];
};

export async function loadArticlePageData(
	slug: string,
	origin: string
): Promise<ArticlePageDataResult | null> {
	const articleId = await resolvePublishedArticleId(slug);
	if (articleId == null) return null;

	const doc = await fetchArticleByIdFromCMS(articleId);
	if (!isPublishedArticle(doc)) return null;

	const relatedModels = await fetchModelsRelatedToArticle(articleId);

	return {
		article: doc,
		meta: buildArticlePageMeta(doc, origin, slug),
		relatedModels
	};
}
