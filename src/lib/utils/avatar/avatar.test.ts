import { describe, expect, it } from 'vitest';
import { getAvatarUrl, gravatarProfileUrl, normalizeAvatarEmail } from './avatar';

describe('avatar utils', () => {
	it('normalizes email for gravatar', () => {
		expect(normalizeAvatarEmail('  Foo@Example.COM ')).toBe('foo@example.com');
	});

	it('prefers provided image over gravatar', () => {
		expect(
			getAvatarUrl({
				image: 'https://cdn.example.com/me.png',
				gravatarHash: 'abc123'
			})
		).toBe('https://cdn.example.com/me.png');
	});

	it('builds gravatar url with identicon default', () => {
		expect(getAvatarUrl({ gravatarHash: 'abc123', size: 96 })).toBe(
			'https://www.gravatar.com/avatar/abc123?s=96&d=identicon&r=pg'
		);
	});

	it('builds gravatar profile link', () => {
		expect(gravatarProfileUrl('Foo@Example.com')).toBe('https://gravatar.com/foo%40example.com');
	});
});
