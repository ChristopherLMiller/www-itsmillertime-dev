import { PUBLIC_URL } from '$env/static/public';
import { getPayloadSDK } from '$lib/payload';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async function GET({ fetch, setHeaders }) {
	const sdk = getPayloadSDK(fetch);
	const posts = await sdk.find({
		collection: 'posts',
		limit: 1000,
		sort: '-publishedAt'
	});

	const pages = await sdk.find({
		collection: 'pages',
		limit: 1000
	});
	const models = await sdk.find({
		collection: 'models',
		limit: 1000
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
		models.models.map((model) => {
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
