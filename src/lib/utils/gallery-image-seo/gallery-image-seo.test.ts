import { describe, expect, it } from 'vitest';

import type { GalleryAlbumPageMeta } from '$lib/cache/galleryCache';
import { plainTextToLexical } from '$lib/utils/lexical-to-text';

import { buildGalleryImagePageMeta, resolveGalleryImageSeoAsset } from './gallery-image-seo';

const albumMeta: GalleryAlbumPageMeta = {
	title: 'Air Show',
	metaTitle: 'Air Show SEO',
	description: 'Album description',
	metaDescription: 'Album description',
	image: { url: '/album-cover.jpg' },
	metaImage: { url: '/album-cover.jpg' },
	canonicalURL: 'https://example.com/galleries/air-show'
};

describe('resolveGalleryImageSeoAsset', () => {
	it('prefers an explicit CMS SEO image', () => {
		expect(
			resolveGalleryImageSeoAsset({
				url: '/photo.jpg',
				meta: { image: { url: '/custom-og.jpg' } }
			})
		).toEqual({ url: '/custom-og.jpg' });
	});

	it('uses the photo when it has an og size', () => {
		const image = { sizes: { og: { url: '/photo-og.jpg', width: 1200, height: 630 } } };
		expect(resolveGalleryImageSeoAsset(image)).toEqual(image);
	});

	it('uses nested upload media when the row itself has no url', () => {
		expect(
			resolveGalleryImageSeoAsset({
				image: { url: '/nested.jpg', width: 800, height: 600 }
			})
		).toEqual({ url: '/nested.jpg', width: 800, height: 600 });
	});

	it('returns null when nothing is usable', () => {
		expect(resolveGalleryImageSeoAsset({ alt: 'A title' })).toBeNull();
		expect(resolveGalleryImageSeoAsset({ meta: { image: 12 } })).toBeNull();
	});
});

describe('buildGalleryImagePageMeta', () => {
	it('overrides title, description, image, and canonical from the selected photo', () => {
		const meta = buildGalleryImagePageMeta({
			image: {
				alt: 'Golden hour at the lake',
				filename: 'IMG_1234.jpg',
				caption: plainTextToLexical('Shot from the west bank.'),
				url: '/photo.jpg',
				width: 2400,
				height: 1600,
				sizes: { og: { url: '/photo-og.jpg', width: 1200, height: 630 } }
			},
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 42
		});

		expect(meta.title).toBe('Golden hour at the lake');
		expect(meta.metaTitle).toBe('Golden hour at the lake');
		expect(meta.description).toBe('Shot from the west bank.');
		expect(meta.metaDescription).toBe('Shot from the west bank.');
		expect(meta.image).toEqual({
			alt: 'Golden hour at the lake',
			filename: 'IMG_1234.jpg',
			caption: plainTextToLexical('Shot from the west bank.'),
			url: '/photo.jpg',
			width: 2400,
			height: 1600,
			sizes: { og: { url: '/photo-og.jpg', width: 1200, height: 630 } }
		});
		expect(meta.canonicalURL).toBe('https://example.com/galleries/air-show?selected=42');
	});

	it('skips filename-like alts and keeps the album title', () => {
		const meta = buildGalleryImagePageMeta({
			image: {
				alt: 'IMG 2848',
				filename: 'IMG_2848.jpg',
				url: '/photo.jpg'
			},
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 7
		});

		expect(meta.title).toBe('Air Show');
		expect(meta.description).toBe('Album description');
		expect(meta.image).toMatchObject({ url: '/photo.jpg' });
	});

	it('uses album title and description when the photo has no alt or caption', () => {
		const meta = buildGalleryImagePageMeta({
			image: {
				alt: '',
				caption: null,
				url: '/photo.jpg'
			},
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 11
		});

		expect(meta.title).toBe('Air Show');
		expect(meta.metaTitle).toBe('Air Show SEO');
		expect(meta.description).toBe('Album description');
		expect(meta.metaDescription).toBe('Album description');
		expect(meta.image).toMatchObject({ url: '/photo.jpg' });
	});

	it('keeps a real alt and fills a missing caption from the album', () => {
		const meta = buildGalleryImagePageMeta({
			image: {
				alt: 'Golden hour at the lake',
				filename: 'IMG_1234.jpg',
				url: '/photo.jpg'
			},
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 12
		});

		expect(meta.title).toBe('Golden hour at the lake');
		expect(meta.description).toBe('Album description');
	});

	it('keeps a caption and fills a missing alt from the album', () => {
		const meta = buildGalleryImagePageMeta({
			image: {
				alt: '',
				caption: plainTextToLexical('Shot from the west bank.'),
				url: '/photo.jpg'
			},
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 13
		});

		expect(meta.title).toBe('Air Show');
		expect(meta.description).toBe('Shot from the west bank.');
	});

	it('prefers CMS per-image SEO fields when present', () => {
		const meta = buildGalleryImagePageMeta({
			image: {
				alt: 'Display alt',
				caption: plainTextToLexical('Display caption'),
				url: '/photo.jpg',
				meta: {
					title: 'CMS title',
					description: 'CMS description',
					image: { url: '/cms-og.jpg' }
				}
			},
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 9
		});

		expect(meta.title).toBe('CMS title');
		expect(meta.description).toBe('CMS description');
		expect(meta.image).toEqual({ url: '/cms-og.jpg' });
	});

	it('falls back to the album cover when the photo has no public url yet', () => {
		const meta = buildGalleryImagePageMeta({
			image: { alt: 'Golden hour at the lake' },
			albumMeta,
			origin: 'https://example.com',
			slug: 'air-show',
			selectedId: 3
		});

		expect(meta.title).toBe('Golden hour at the lake');
		expect(meta.image).toEqual({ url: '/album-cover.jpg' });
		expect(meta.metaImage).toEqual({ url: '/album-cover.jpg' });
	});
});
