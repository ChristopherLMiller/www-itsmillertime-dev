import type { PromptChoice } from './prompts';
import type { SiteSettingsPatch, SiteSettingsView } from './types';

export function cloneSiteSettings(view: SiteSettingsView): SiteSettingsView {
	return {
		ai: {
			provider: view.ai.provider,
			model: view.ai.model,
			apiKey: view.ai.apiKey,
			prompts: view.ai.prompts.map((row) => ({ ...row }))
		},
		lastfm: { ...view.lastfm },
		email: { ...view.email }
	};
}

export async function patchSiteSettings(patch: SiteSettingsPatch): Promise<SiteSettingsView> {
	const res = await fetch('/api/admin/settings', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(patch)
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			typeof body === 'object' && body && typeof (body as { error?: string }).error === 'string'
				? (body as { error: string }).error
				: 'Failed to save settings';
		throw new Error(message);
	}
	return body as SiteSettingsView;
}

export async function fetchAiPromptChoices(): Promise<{
	defaultSlug: string;
	prompts: PromptChoice[];
}> {
	const res = await fetch('/api/admin/settings/prompts', {
		headers: { Accept: 'application/json' }
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			typeof body === 'object' && body && typeof (body as { error?: string }).error === 'string'
				? (body as { error: string }).error
				: 'Failed to load prompts';
		throw new Error(message);
	}
	const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const defaultSlug = typeof rec.defaultSlug === 'string' ? rec.defaultSlug : '';
	const promptsRaw = Array.isArray(rec.prompts) ? rec.prompts : [];
	const prompts: PromptChoice[] = [];
	for (const row of promptsRaw) {
		if (!row || typeof row !== 'object') continue;
		const slug = 'slug' in row && typeof row.slug === 'string' ? row.slug : '';
		const label = 'label' in row && typeof row.label === 'string' ? row.label : '';
		if (!slug) continue;
		prompts.push({ slug, label: label || slug });
	}
	return { defaultSlug, prompts };
}
