import { describe, expect, it } from 'vitest';

import {
	buildPlaceholderGalleryMedia,
	galleryImageDocToDisplayMedia
} from './gallery-image-display';

describe('buildPlaceholderGalleryMedia', () => {
	it('uses dimensions when valid', () => {
		const m = buildPlaceholderGalleryMedia({
			galleryImageId: 7,
			blurhash: null,
			width: 400,
			height: 200,
			aspectRatioFallback: 1,
			isNsfw: false
		});
		expect(m.width).toBe(400);
		expect(m.height).toBe(200);
		expect(m.galleryImageId).toBe(7);
		expect(m.isNsfw).toBe(false);
		expect(m.blurhash).toBeNull();
	});

	it('derives size from aspectRatioFallback when width/height missing', () => {
		const m = buildPlaceholderGalleryMedia({
			galleryImageId: 1,
			blurhash: 'abc',
			aspectRatioFallback: 16 / 9
		});
		expect(m.height).toBe(100);
		expect(m.width).toBe(Math.round(100 * (16 / 9)));
		expect(m.blurhash).toBe('abc');
	});
});

describe('galleryImageDocToDisplayMedia', () => {
	it('returns null for non-objects', () => {
		expect(galleryImageDocToDisplayMedia(null, false)).toBeNull();
		expect(galleryImageDocToDisplayMedia('x', false)).toBeNull();
	});

	it('maps flat media-shaped doc', () => {
		const doc = {
			id: 10,
			url: '/file.jpg',
			alt: 'A',
			width: 100,
			height: 100,
			updatedAt: 'x',
			createdAt: 'y'
		};
		const m = galleryImageDocToDisplayMedia(doc, false);
		expect(m?.id).toBe(10);
		expect(m?.url).toBe('/file.jpg');
		expect(m?.galleryImageId).toBe(10);
		expect(m?.isNsfw).toBe(false);
	});

	it('respects album NSFW flag', () => {
		const doc = { id: 1, url: '/x', alt: '', width: 1, height: 1, updatedAt: '', createdAt: '' };
		expect(galleryImageDocToDisplayMedia(doc, true)?.isNsfw).toBe(true);
	});

	it('extracts nested image media', () => {
		const doc = {
			id: 5,
			image: {
				id: 99,
				url: '/nested.jpg',
				alt: 'n',
				width: 1,
				height: 1,
				updatedAt: '',
				createdAt: ''
			}
		};
		const m = galleryImageDocToDisplayMedia(doc, false);
		expect(m?.url).toBe('/nested.jpg');
		expect(m?.galleryImageId).toBe(5);
	});
});
