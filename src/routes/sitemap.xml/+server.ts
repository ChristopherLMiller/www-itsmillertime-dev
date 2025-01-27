import { env } from '$env/dynamic/public';
import { cacheManager } from '$lib/cache/cache';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async function GET({ setHeaders }) {
	const posts = await cacheManager.fetch('posts');
	const pages = await cacheManager.fetch('pages');
	const xml = `
  <?xml version="1.0" encoding="UTF-8" ?>
    <urlset
      xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
      xmlns:xhtml="https://www.w3.org/1999/xhtml"
      xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
      xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
      xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
    >
            ${pages.data
							.map(
								(page) => `
        <url>
          <loc>${env.PUBLIC_URL}/${page.slug}</loc>
          <changefreq>daily</changefreq>
          <priority>1.0</priority>
        </url>
      `
							)
							.join('')} 
      ${posts.data
				.map(
					(post) => `
        <url>
          <loc>${env.PUBLIC_URL}/articles/${post.slug}</loc>
          <changefreq>daily</changefreq>
          <priority>1.0</priority>
        </url>
      `
				)
				.join('')} 
  </urlset>
  `;

	setHeaders({
		'Cache-Control': 'max-age=0, s-maxage=3600',
		'Content-Type': 'application/xml'
	});

	return new Response(xml);
};
