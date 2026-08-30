import { canAccessAdmin, getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { SettingsEncryptionError } from '$lib/settings/encryption.server';
import { IMAGE_ALT_PROMPT_SLUG, listPromptChoices } from '$lib/settings/prompts';
import { loadSiteSettings } from '$lib/settings/site-settings.server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Admin-only: prompt labels for the gallery Suggest with AI picker (no secrets). */
export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!canAccessAdmin(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	try {
		const settings = await loadSiteSettings(event.fetch, event.request);
		return json({
			defaultSlug: IMAGE_ALT_PROMPT_SLUG,
			prompts: listPromptChoices(settings.ai.prompts)
		});
	} catch (err) {
		if (err instanceof SettingsEncryptionError) {
			return json({ error: err.message }, { status: 503 });
		}
		console.error('[admin/settings/prompts]', err);
		return json({ error: 'Failed to load prompts' }, { status: 500 });
	}
};
