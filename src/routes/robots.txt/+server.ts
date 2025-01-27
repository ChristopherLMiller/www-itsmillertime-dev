import { env } from '$env/dynamic/public';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async function GET({ setHeaders }) {
	const robotsTxt = `
  User-agent: *
  Disallow: /admin
  Disallow: /api

  Sitemap: https://${env.PUBLIC_URL}/sitemap.xml
`;

	setHeaders({
		'Cache-Control': 'max-age=0, s-maxage=3600',
		'Content-Type': 'text/plain'
	});

	return new Response(robotsTxt);
};
