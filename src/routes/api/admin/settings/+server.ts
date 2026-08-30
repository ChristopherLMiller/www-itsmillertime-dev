import { canAccessAdmin, getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { SettingsEncryptionError } from '$lib/settings/encryption.server';
import { loadSiteSettings, saveSiteSettings } from '$lib/settings/site-settings.server';
import type { SiteSettingsPatch, SiteSettingsView } from '$lib/settings/types';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAi(ai: Record<string, unknown>): SiteSettingsView['ai'] {
	const provider = ai.provider === 'openai' ? 'openai' : 'anthropic';
	const promptsRaw = Array.isArray(ai.prompts) ? ai.prompts : [];
	return {
		provider,
		model: typeof ai.model === 'string' ? ai.model : '',
		apiKey: typeof ai.apiKey === 'string' ? ai.apiKey : '',
		prompts: promptsRaw.map((row) => {
			const rec = isRecord(row) ? row : {};
			return {
				slug: typeof rec.slug === 'string' ? rec.slug : '',
				label: typeof rec.label === 'string' ? rec.label : '',
				body: typeof rec.body === 'string' ? rec.body : '',
				id: typeof rec.id === 'string' ? rec.id : undefined
			};
		})
	};
}

function parseLastfm(lastfm: Record<string, unknown>): SiteSettingsView['lastfm'] {
	return {
		username: typeof lastfm.username === 'string' ? lastfm.username : '',
		apiKey: typeof lastfm.apiKey === 'string' ? lastfm.apiKey : ''
	};
}

function parseEmail(email: Record<string, unknown>): SiteSettingsView['email'] {
	return {
		resendApiKey: typeof email.resendApiKey === 'string' ? email.resendApiKey : '',
		fromAddress: typeof email.fromAddress === 'string' ? email.fromAddress : '',
		fromName: typeof email.fromName === 'string' ? email.fromName : ''
	};
}

function parsePatch(body: unknown): SiteSettingsPatch {
	if (!isRecord(body)) throw error(400, 'Invalid request body');
	const patch: SiteSettingsPatch = {};
	if ('ai' in body) {
		if (!isRecord(body.ai)) throw error(400, 'Invalid ai settings');
		patch.ai = parseAi(body.ai);
	}
	if ('lastfm' in body) {
		if (!isRecord(body.lastfm)) throw error(400, 'Invalid lastfm settings');
		patch.lastfm = parseLastfm(body.lastfm);
	}
	if ('email' in body) {
		if (!isRecord(body.email)) throw error(400, 'Invalid email settings');
		patch.email = parseEmail(body.email);
	}
	if (!patch.ai && !patch.lastfm && !patch.email) {
		throw error(400, 'No settings to update');
	}
	return patch;
}

export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!canAccessAdmin(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	try {
		const settings = await loadSiteSettings(event.fetch, event.request);
		return json(settings);
	} catch (err) {
		if (err instanceof SettingsEncryptionError) {
			return json({ error: err.message }, { status: 503 });
		}
		console.error('[admin/settings]', err);
		return json({ error: 'Failed to load settings' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!canAccessAdmin(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	let raw: unknown;
	try {
		raw = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const saved = await saveSiteSettings(event.fetch, event.request, parsePatch(raw));
		return json(saved);
	} catch (err) {
		if (err instanceof SettingsEncryptionError) {
			return json({ error: err.message }, { status: 503 });
		}
		const message = err instanceof Error ? err.message : 'Failed to save settings';
		return json({ error: message }, { status: 502 });
	}
};
