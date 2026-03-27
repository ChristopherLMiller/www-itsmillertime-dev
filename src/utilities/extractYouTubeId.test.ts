import { describe, expect, it } from 'vitest';

import { extractYouTubeId } from './extractYouTubeId';

describe('extractYouTubeId', () => {
	it('returns null for empty string', () => {
		expect(extractYouTubeId('')).toBeNull();
	});

	it('parses watch URL', () => {
		expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('parses short youtu.be URL', () => {
		expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('parses embed URL', () => {
		expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('accepts bare 11-char id', () => {
		expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('returns null when no id matches', () => {
		expect(extractYouTubeId('https://example.com')).toBeNull();
	});
});
