import { describe, expect, it } from 'vitest';

import { buildArticlePageMeta } from './articleCache';
import type { Post } from '$lib/types/payload-types';

const origin = 'https://www.itsmillertime.dev';
const slug = 'reviewed-revell-1-48-sbd-5-dauntless';

function post(overrides: Partial<Post> = {}): Post {
	return {
		id: 57,
		title: 'Reviewed - Revell 1/48 SBD-5 Dauntless',
		slug,
		updatedAt: '2026-09-20T00:00:00.000Z',
		createdAt: '2026-09-04T00:00:00.000Z',
		...overrides
	};
}

describe('buildArticlePageMeta', () => {
	it('uses Payload SEO fields and sets a canonical URL', () => {
		const meta = buildArticlePageMeta(
			post({
				meta: {
					title: 'Reviewed - Revell 1/48 SBD-5 Dauntless | Article | ItsMillerTime',
					description: 'About the Model\nIn 1940...',
					image: {
						id: 1257,
						alt: 'Revell SBD-5 Boxart',
						url: '/api/media/file/dauntless-boxart.avif',
						updatedAt: '2026-09-04T00:00:00.000Z',
						createdAt: '2026-09-04T00:00:00.000Z',
						sizes: {
							og: { url: '/api/media/file/dauntless-boxart-1200x630.jpg', width: 1200, height: 630 }
						}
					}
				}
			}),
			origin,
			slug
		);

		expect(meta.title).toBe('Reviewed - Revell 1/48 SBD-5 Dauntless | Article | ItsMillerTime');
		expect(meta.metaTitle).toBe(meta.title);
		expect(meta.description).toBe('About the Model\nIn 1940...');
		expect(meta.canonicalURL).toBe(`${origin}/articles/${slug}`);
		expect(meta.metaImage).toMatchObject({
			url: '/api/media/file/dauntless-boxart.avif'
		});
	});

	it('falls back to the article title and featured image when SEO fields are missing', () => {
		const meta = buildArticlePageMeta(
			post({
				featuredImage: {
					id: 1257,
					alt: 'Revell SBD-5 Boxart',
					url: '/api/media/file/dauntless-boxart.avif',
					updatedAt: '2026-09-04T00:00:00.000Z',
					createdAt: '2026-09-04T00:00:00.000Z',
					sizes: {
						og: { url: '/api/media/file/dauntless-boxart-1200x630.jpg', width: 1200, height: 630 }
					}
				}
			}),
			origin,
			slug
		);

		expect(meta.title).toBeUndefined();
		expect(meta.metaTitle).toBe('Reviewed - Revell 1/48 SBD-5 Dauntless');
		expect(meta.image).toMatchObject({ url: '/api/media/file/dauntless-boxart.avif' });
		expect(meta.canonicalURL).toBe(`${origin}/articles/${slug}`);
	});

	it('ignores unpopulated image ids', () => {
		const meta = buildArticlePageMeta(
			post({
				featuredImage: 1257,
				meta: { title: 'SEO title', image: 1257 }
			}),
			origin,
			slug
		);

		expect(meta.title).toBe('SEO title');
		expect(meta.image).toBeUndefined();
		expect(meta.metaImage).toBeUndefined();
	});
});
