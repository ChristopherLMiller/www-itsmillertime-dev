import { describe, expect, it } from 'vitest';
import { queryKeysForCmsEvent } from '$lib/cms-events/queryKeysForEvent';
import { toPublicCmsEvent } from '$lib/cms-events/toPublicEvent';

describe('toPublicCmsEvent', () => {
	it('drops connected and read events', () => {
		expect(toPublicCmsEvent({ type: 'connected', message: 'ok' })).toBeNull();
		expect(
			toPublicCmsEvent({
				action: 'read',
				collection: 'posts',
				timestamp: '2026-01-01T00:00:00.000Z'
			})
		).toBeNull();
	});

	it('keeps create/update/delete and pulls slug without document bodies', () => {
		const event = toPublicCmsEvent({
			action: 'update',
			collection: 'posts',
			id: 12,
			data: { slug: 'hello-world', title: 'secret draft title', content: { root: {} } },
			timestamp: '2026-01-01T00:00:00.000Z'
		});
		expect(event).toEqual({
			action: 'update',
			collection: 'posts',
			id: 12,
			slug: 'hello-world',
			timestamp: '2026-01-01T00:00:00.000Z'
		});
	});

	it('drops draft document updates so unpublished slugs are not broadcast', () => {
		expect(
			toPublicCmsEvent({
				action: 'update',
				collection: 'posts',
				id: 12,
				data: { slug: 'secret-draft', _status: 'draft' },
				timestamp: '2026-01-01T00:00:00.000Z'
			})
		).toBeNull();
	});

	it('keeps a slug already present on a public event', () => {
		expect(
			toPublicCmsEvent({
				action: 'delete',
				collection: 'posts',
				id: 12,
				slug: 'hello-world',
				timestamp: '2026-01-01T00:00:00.000Z'
			})
		).toMatchObject({ slug: 'hello-world' });
	});
});

describe('queryKeysForCmsEvent', () => {
	it('invalidates article list + specific slug', () => {
		expect(
			queryKeysForCmsEvent({
				action: 'update',
				collection: 'posts',
				slug: 'hello-world',
				timestamp: 't'
			})
		).toEqual([['articles'], ['article', 'hello-world']]);
	});

	it('invalidates all article queries when a tag changes', () => {
		expect(
			queryKeysForCmsEvent({
				action: 'update',
				collection: 'posts-tags',
				timestamp: 't'
			})
		).toEqual([['articles'], ['article']]);
	});
});
