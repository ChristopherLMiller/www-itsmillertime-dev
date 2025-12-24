import { PUBLIC_URL } from '$env/static/public';
import { getPayloadSDK } from '$lib/payload';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async function GET({ fetch, setHeaders }) {
	const sdk = getPayloadSDK(fetch);
	// Count how many posts are published first
	const postsCount = await sdk.count({
		collection: 'posts',
		where: {
			_status: {
				equals: 'published'
			}
		}
	});

	// Count how many pages are published and visible to all
	const pagesCount = await sdk.count({
		collection: 'pages',
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					}
				},
				{
					visibility: {
						equals: 'ALL'
					}
				}
			]
		}
	});

	// Find all the models that have been started at least
	const modelsCount = await sdk.count({
		collection: 'models',
		where: {
			'model_meta.status': {
				not_equals: 'NOT_STARTED'
			}
		}
	});

	const posts = await sdk.find({
		collection: 'posts',
		limit: postsCount.totalDocs,
		where: {
			_status: {
				equals: 'published'
			}
		},
		sort: '-publishedAt'
	});

	const pages = await sdk.find({
		collection: 'pages',
		limit: pagesCount.totalDocs,
		where: {
			and: [
				{
					_status: {
						equals: 'published'
					}
				},
				{
					visibility: {
						equals: 'ALL'
					}
				}
			]
		}
	});

	const models = await sdk.find({
		collection: 'models',
		limit: modelsCount.totalDocs,
		where: {
			'model_meta.status': {
				not_equals: 'NOT_STARTED'
			}
		}
	});

	const postsOutput =
		posts &&
		posts.docs.map((post) => {
			return `
    <url>
      <loc>${PUBLIC_URL}/articles/${post.slug}</loc>
      <changefreq>weekly</changefreq>
      <priority>1.0</priority>
    </url>
    `;
		});

	const pagesOutput =
		pages &&
		pages.docs.map((page) => {
			return `
    <url>
      <loc>${PUBLIC_URL}/${page.slug}</loc>
      <changefreq>monthly</changefreq>
      <priority>1.0</priority>
    </url>
    `;
		});

	const modelsOutput =
		models &&
		models.docs.map((model) => {
			return `
    <url>
      <loc>${PUBLIC_URL}/models/${model.slug}</loc>
      <changefreq>monthly</changefreq>
      <priority>1.0</priority>
    </url>
    `;
		});

	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <urlset
      xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
      xmlns:xhtml="https://www.w3.org/1999/xhtml"
      xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
      xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
      xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
    >
      ${postsOutput?.join('') || ''}
      ${pagesOutput?.join('') || ''}
			${modelsOutput?.join('') || ''}

  </urlset>`;

	setHeaders({
		'Cache-Control': 'max-age=0, s-maxage=3600',
		'Content-Type': 'application/xml'
	});

	return new Response(xml);
};
