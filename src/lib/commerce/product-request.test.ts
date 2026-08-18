import { describe, expect, it } from 'vitest';

import { parseProductRequestBody } from './product-request';

describe('parseProductRequestBody', () => {
	it('parses a complete waitlist request', () => {
		expect(
			parseProductRequestBody({
				name: '  Chris Miller  ',
				email: 'Chris@ItsMillerTime.dev',
				galleryImageId: 42,
				albumSlug: 'Lake-Erie'
			})
		).toEqual({
			ok: true,
			data: {
				name: 'Chris Miller',
				email: 'chris@itsmillertime.dev',
				galleryImageId: 42,
				albumSlug: 'lake-erie'
			}
		});
	});

	it('allows a missing album slug', () => {
		expect(
			parseProductRequestBody({
				name: 'Chris',
				email: 'chris@example.com',
				galleryImageId: '7'
			})
		).toEqual({
			ok: true,
			data: {
				name: 'Chris',
				email: 'chris@example.com',
				galleryImageId: 7,
				albumSlug: null
			}
		});
	});

	it('rejects missing name, email, or image id', () => {
		expect(parseProductRequestBody({ email: 'a@b.co', galleryImageId: 1 })).toEqual({
			ok: false,
			error: 'Name is required'
		});
		expect(parseProductRequestBody({ name: 'Chris', galleryImageId: 1 })).toEqual({
			ok: false,
			error: 'Email is required'
		});
		expect(parseProductRequestBody({ name: 'Chris', email: 'a@b.co' })).toEqual({
			ok: false,
			error: 'Invalid gallery image id'
		});
	});

	it('rejects invalid email, id, and slug values', () => {
		expect(
			parseProductRequestBody({ name: 'Chris', email: 'not-an-email', galleryImageId: 1 })
		).toEqual({ ok: false, error: 'Invalid email address' });
		expect(parseProductRequestBody({ name: 'Chris', email: 'a@b.co', galleryImageId: 0 })).toEqual({
			ok: false,
			error: 'Invalid gallery image id'
		});
		expect(
			parseProductRequestBody({
				name: 'Chris',
				email: 'a@b.co',
				galleryImageId: 1,
				albumSlug: '../etc'
			})
		).toEqual({ ok: false, error: 'Invalid album slug' });
	});
});
