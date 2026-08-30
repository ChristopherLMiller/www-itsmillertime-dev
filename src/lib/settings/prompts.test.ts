import { describe, expect, it } from 'vitest';

import {
	DEFAULT_IMAGE_ALT_PROMPT,
	defaultPromptChoiceSlug,
	ensurePromptSlugs,
	getPrompt,
	IMAGE_ALT_PROMPT_SLUG,
	isKnownPromptUse,
	listPromptChoices,
	parsePromptSlug,
	promptUseLabel,
	resolveImageAltPrompt,
	slugifyPromptLabel
} from './prompts';

describe('getPrompt', () => {
	it('returns the body for a matching slug', () => {
		expect(
			getPrompt(
				[
					{ slug: 'other', label: 'Other', body: 'nope' },
					{ slug: 'image-alt', label: 'Photo alt text', body: '  Write short alt text.  ' }
				],
				IMAGE_ALT_PROMPT_SLUG
			)
		).toBe('Write short alt text.');
	});

	it('matches slugs case-insensitively and ignores empty bodies', () => {
		expect(
			getPrompt([{ slug: 'Image-Alt', label: 'Photo', body: '   ' }], 'IMAGE-ALT')
		).toBeUndefined();
		expect(getPrompt([], 'image-alt')).toBeUndefined();
		expect(getPrompt(null, 'image-alt')).toBeUndefined();
	});
});

describe('resolveImageAltPrompt', () => {
	it('uses the saved image-alt prompt', () => {
		expect(
			resolveImageAltPrompt([
				{ slug: 'other', label: 'Other', body: 'nope' },
				{ slug: 'image-alt', label: 'Photo alt text', body: '  Saved analyzer prompt.  ' }
			])
		).toBe('Saved analyzer prompt.');
	});

	it('does not use a prompt that is not assigned to photo alt text', () => {
		expect(
			resolveImageAltPrompt([{ slug: 'photo', label: 'Photo', body: 'Describe the photo.' }])
		).toBe(DEFAULT_IMAGE_ALT_PROMPT);
	});

	it('uses the built-in default only when nothing is assigned', () => {
		expect(resolveImageAltPrompt([])).toBe(DEFAULT_IMAGE_ALT_PROMPT);
		expect(resolveImageAltPrompt(null)).toBe(DEFAULT_IMAGE_ALT_PROMPT);
	});
});

describe('prompt uses', () => {
	it('recognizes assigned features', () => {
		expect(isKnownPromptUse('image-alt')).toBe(true);
		expect(isKnownPromptUse('IMAGE-ALT')).toBe(true);
		expect(isKnownPromptUse('other')).toBe(false);
		expect(promptUseLabel('image-alt')).toBe('Suggest photo alt text');
		expect(promptUseLabel('other')).toBeUndefined();
	});
});

describe('parsePromptSlug', () => {
	it('trims and caps length', () => {
		expect(parsePromptSlug('  aircraft  ')).toBe('aircraft');
		expect(parsePromptSlug(12)).toBeUndefined();
		expect(parsePromptSlug('')).toBeUndefined();
		expect(parsePromptSlug('x'.repeat(200))?.length).toBe(80);
	});
});

describe('listPromptChoices', () => {
	it('lists prompts with a slug and body, default first', () => {
		expect(
			listPromptChoices([
				{ slug: 'aircraft', label: 'Aircraft', body: 'Name the jet.' },
				{ slug: 'image-alt', label: 'Photo alt text', body: 'Write short alt text.' },
				{ slug: 'empty', label: 'Empty', body: '   ' }
			])
		).toEqual([
			{ slug: 'image-alt', label: 'Photo alt text' },
			{ slug: 'aircraft', label: 'Aircraft' }
		]);
	});

	it('skips rows without a slug', () => {
		expect(listPromptChoices([{ slug: '', label: 'Nope', body: 'body' }])).toEqual([]);
	});
});

describe('defaultPromptChoiceSlug', () => {
	it('prefers the last used slug, then the assigned default', () => {
		const choices = [
			{ slug: 'image-alt', label: 'Photo alt text' },
			{ slug: 'aircraft', label: 'Aircraft' }
		];
		expect(defaultPromptChoiceSlug(choices, 'aircraft')).toBe('aircraft');
		expect(defaultPromptChoiceSlug(choices, 'missing')).toBe('image-alt');
		expect(defaultPromptChoiceSlug([], 'aircraft')).toBe('');
	});
});

describe('ensurePromptSlugs', () => {
	it('fills empty slugs from labels and keeps them unique', () => {
		expect(slugifyPromptLabel('  Air Show Jets  ')).toBe('air-show-jets');
		expect(
			ensurePromptSlugs([
				{ slug: '', label: 'Aircraft', body: 'jets' },
				{ slug: 'aircraft', label: 'Aircraft copy', body: 'also jets' },
				{ slug: 'image-alt', label: 'Photo', body: 'default' }
			])
		).toEqual([
			{ slug: 'aircraft-2', label: 'Aircraft', body: 'jets' },
			{ slug: 'aircraft', label: 'Aircraft copy', body: 'also jets' },
			{ slug: 'image-alt', label: 'Photo', body: 'default' }
		]);
	});

	it('fills a slug from the body, then a prompt-n fallback', () => {
		expect(ensurePromptSlugs([{ slug: '', label: '', body: 'Name the aircraft type.' }])[0]).toEqual(
			{
				slug: 'name-the-aircraft-type',
				label: 'name-the-aircraft-type',
				body: 'Name the aircraft type.'
			}
		);
		expect(ensurePromptSlugs([{ slug: '', label: '', body: '' }])[0].slug).toBe('prompt-1');
	});
});
