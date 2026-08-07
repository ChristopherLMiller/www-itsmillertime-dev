import { describe, expect, it } from 'vitest';

import {
	altMatchesFilename,
	buildPlaceholderGalleryMedia,
	displayableImageTitle,
	galleryImageDocToDisplayMedia
} from './gallery-image-display';

describe('altMatchesFilename / displayableImageTitle', () => {
	it('matches filename with or without extension', () => {
		expect(altMatchesFilename('IMG_1234.JPG', 'IMG_1234.JPG')).toBe(true);
		expect(altMatchesFilename('IMG_1234', 'IMG_1234.JPG')).toBe(true);
		expect(altMatchesFilename('img 1234', 'IMG_1234.jpg')).toBe(true);
	});

	it('does not match real titles', () => {
		expect(altMatchesFilename('Golden hour at the lake', 'IMG_1234.JPG')).toBe(false);
		expect(displayableImageTitle('Golden hour at the lake', 'IMG_1234.JPG')).toBe(
			'Golden hour at the lake'
		);
	});

	it('returns empty when alt is filename-like or blank', () => {
		expect(displayableImageTitle('DSC_0001.jpg', 'DSC_0001.jpg')).toBe('');
		expect(displayableImageTitle('  ', 'DSC_0001.jpg')).toBe('');
		expect(displayableImageTitle('DSC_0001.jpg', null)).toBe('DSC_0001.jpg');
	});
});

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
		expect(m?.needsProxy).toBe(false);
	});

	it('respects album NSFW flag', () => {
		const doc = { id: 1, url: '/x', alt: '', width: 1, height: 1, updatedAt: '', createdAt: '' };
		const m = galleryImageDocToDisplayMedia(doc, true);
		expect(m?.isNsfw).toBe(true);
		expect(m?.needsProxy).toBe(true);
	});

	it('sets needsProxy for privileged image settings in a public album', () => {
		const doc = {
			id: 3,
			url: '/secret.jpg',
			alt: '',
			width: 1,
			height: 1,
			updatedAt: '',
			createdAt: '',
			settings: {
				visibility: 'PRIVILEGED' as const,
				permittedRoles: ['family' as const],
				isNsfw: false
			}
		};
		const m = galleryImageDocToDisplayMedia(doc, false);
		expect(m?.needsProxy).toBe(true);
		expect(m?.isNsfw).toBe(false);
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
		expect(m?.needsProxy).toBe(false);
	});
});
