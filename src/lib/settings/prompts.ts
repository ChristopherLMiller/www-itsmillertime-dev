export const IMAGE_ALT_PROMPT_SLUG = 'image-alt';

export const DEFAULT_IMAGE_ALT_PROMPT = [
	'You write short image titles that also work as HTML alt text for a photographer’s website.',
	'Describe the visible scene: subject, setting, and notable action or mood.',
	'One sentence or short phrase, typically 8–20 words.',
	'When the subject is an aircraft, name a specific type or model only if you can tell it apart from other types that look similar — size, cockpit layout, wing and tail shape, landing gear, cowl, stores, and markings. If those cues are not enough to be sure, describe the aircraft generically (single-engine warbird, radial-engine naval fighter, jet trainer, etc.). Never guess a type.',
	'Many aircraft families look alike. A wrong specific name is worse than a generic description. If two or more types remain plausible, name neither.',
	'Do not default to whatever type is most common at airshows. Album title is optional context only; it does not prove the type in the photo.',
	'If a tail number or registration is clearly readable, you may include it. Do not invent a type or operator from a registration you cannot actually read.',
	'When the photo is an airshow or flying display, name a specific operator, performer, demo team, or named act only if identified from distinctive aircraft, livery, readable registration, paint scheme, or unique routine — not from a generic type (many people fly the same kind of airplane). Civilian examples include a named aerobatic pilot and their unique airplane; military demo teams (Thunderbirds, Blue Angels, and similar) may be named when the livery is clear. If you are not reasonably sure who it is, name the aircraft only, or describe it generically if the type is unsure.',
	'If the airplane is a static display on the ground, do not mention that people are looking at it.',
	'When the subject is a plant, name it if it is identifiable (common name; add cultivar or scientific name only when clear). If unsure, describe the plant without inventing a species.',
	'Do not name spectators or unidentified people. Do not guess family members. Named airshow operators are allowed when identified as above.',
	'Do not start with “Image of”, “Photo of”, “Picture of”, or “A photo showing”.',
	'No quotation marks, hashtags, camera settings, watermarks, or commentary about the task.',
	'If an album title is provided, use it only as optional context; do not copy it unless it matches what is in the photo.',
	'Return only the alt text.'
].join(' ');

/** Features that look up a prompt by slug. Stored on the prompt row as `slug`. */
export const PROMPT_USES = [
	{ slug: IMAGE_ALT_PROMPT_SLUG, label: 'Suggest photo alt text' }
] as const;

export const CUSTOM_PROMPT_USE = '__custom__';

const MAX_PROMPT_SLUG_CHARS = 80;

export type SitePrompt = {
	slug: string;
	label: string;
	body: string;
	id?: string | null;
};

export type PromptChoice = {
	slug: string;
	label: string;
};

export function isKnownPromptUse(slug: string): boolean {
	const want = slug.trim().toLowerCase();
	return PROMPT_USES.some((use) => use.slug === want);
}

export function promptUseLabel(slug: string): string | undefined {
	const want = slug.trim().toLowerCase();
	return PROMPT_USES.find((use) => use.slug === want)?.label;
}

export function getPrompt(
	prompts: SitePrompt[] | null | undefined,
	slug: string
): string | undefined {
	const want = slug.trim().toLowerCase();
	if (!want) return undefined;
	const match = (prompts ?? []).find((row) => row.slug.trim().toLowerCase() === want);
	const body = match?.body?.trim();
	return body || undefined;
}

/** Prompt sent to the gallery “Suggest with AI” analyzer when none is picked. */
export function resolveImageAltPrompt(prompts: SitePrompt[] | null | undefined): string {
	return getPrompt(prompts, IMAGE_ALT_PROMPT_SLUG) ?? DEFAULT_IMAGE_ALT_PROMPT;
}

export function parsePromptSlug(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim().slice(0, MAX_PROMPT_SLUG_CHARS);
	return trimmed || undefined;
}

export function slugifyPromptLabel(label: string): string {
	return label
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, MAX_PROMPT_SLUG_CHARS);
}

function uniquePromptSlug(base: string, used: Set<string>): string {
	let unique = base;
	let n = 2;
	while (used.has(unique.toLowerCase())) {
		const suffix = `-${n++}`;
		unique = `${base.slice(0, MAX_PROMPT_SLUG_CHARS - suffix.length)}${suffix}`;
	}
	used.add(unique.toLowerCase());
	return unique;
}

/** Fill empty slugs from labels (then body) so new rows survive a CMS save. */
export function ensurePromptSlugs(prompts: SitePrompt[]): SitePrompt[] {
	const used = new Set<string>();
	for (const row of prompts) {
		const slug = row.slug.trim();
		if (slug) used.add(slug.toLowerCase());
	}
	return prompts.map((row, index) => {
		const existing = row.slug.trim();
		const slug = existing
			? existing
			: uniquePromptSlug(
					slugifyPromptLabel(row.label) ||
						slugifyPromptLabel(row.body.slice(0, 80)) ||
						`prompt-${index + 1}`,
					used
				);
		return {
			...row,
			slug,
			label: row.label.trim() || promptUseLabel(slug) || slug
		};
	});
}

/** Saved prompts the gallery picker can send (slug + non-empty body). Default use first. */
export function listPromptChoices(prompts: SitePrompt[] | null | undefined): PromptChoice[] {
	const rows: PromptChoice[] = [];
	const seen = new Set<string>();
	for (const row of prompts ?? []) {
		const slug = row.slug.trim();
		if (!slug || !row.body.trim()) continue;
		const key = slug.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		rows.push({
			slug,
			label: row.label.trim() || promptUseLabel(slug) || slug
		});
	}
	const assignedIdx = rows.findIndex(
		(row) => row.slug.trim().toLowerCase() === IMAGE_ALT_PROMPT_SLUG
	);
	if (assignedIdx <= 0) return rows;
	const [assigned] = rows.splice(assignedIdx, 1);
	return [assigned, ...rows];
}

export function defaultPromptChoiceSlug(
	choices: PromptChoice[],
	preferred?: string | null
): string {
	if (choices.length === 0) return '';
	const prefer = preferred?.trim().toLowerCase();
	if (prefer) {
		const match = choices.find((row) => row.slug.trim().toLowerCase() === prefer);
		if (match) return match.slug;
	}
	const assigned = choices.find(
		(row) => row.slug.trim().toLowerCase() === IMAGE_ALT_PROMPT_SLUG
	);
	return assigned?.slug ?? choices[0].slug;
}
