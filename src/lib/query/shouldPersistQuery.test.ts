import { describe, expect, it, vi } from 'vitest';
import { shouldPersistQuery } from './shouldPersistQuery';
import type { Query } from '@tanstack/svelte-query';

vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/svelte-query')>();
	return {
		...actual,
		defaultShouldDehydrateQuery: (query: Query) => query.state.status === 'success'
	};
});

function fakeQuery(queryKey: unknown[], status: Query['state']['status'] = 'success'): Query {
	return {
		queryKey,
		state: { status }
	} as unknown as Query;
}

describe('shouldPersistQuery', () => {
	it('persists layout, article lists, and projects', () => {
		expect(shouldPersistQuery(fakeQuery(['layout']))).toBe(true);
		expect(shouldPersistQuery(fakeQuery(['articles', 'list', {}]))).toBe(true);
		expect(shouldPersistQuery(fakeQuery(['projects', 1, 10]))).toBe(true);
	});

	it('skips full article bodies', () => {
		expect(shouldPersistQuery(fakeQuery(['article', 'my-slug']))).toBe(false);
	});

	it('skips non-success queries', () => {
		expect(shouldPersistQuery(fakeQuery(['layout'], 'pending'))).toBe(false);
	});
});
