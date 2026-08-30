import { env } from '$env/dynamic/private';
import { createPayloadFetch } from '$lib/payload';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { SiteSetting } from '$lib/types/payload-types';
import {
	decryptGroupField,
	encryptGroupField,
	SettingsEncryptionError
} from './encryption.server';
import {
	DEFAULT_IMAGE_ALT_PROMPT,
	getPrompt,
	IMAGE_ALT_PROMPT_SLUG,
	resolveImageAltPrompt
} from './prompts';
import type { SiteSettingsPatch, SiteSettingsView } from './types';

export type { SiteSettingsPatch, SiteSettingsView };

const DEFAULT_MODEL = 'claude-sonnet-5';

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function str(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function parsePrompts(value: unknown): SitePrompt[] {
	if (!Array.isArray(value)) return [];
	const rows: SitePrompt[] = [];
	for (const row of value) {
		const rec = asRecord(row);
		if (!rec) continue;
		const slug = str(rec.slug).trim();
		const label = str(rec.label).trim();
		const body = str(rec.body);
		if (!slug && !label && !body.trim()) continue;
		rows.push({
			slug,
			label,
			body,
			id: typeof rec.id === 'string' ? rec.id : typeof rec.id === 'number' ? String(rec.id) : undefined
		});
	}
	return rows;
}

function emptySettings(): SiteSettingsView {
	return {
		ai: {
			provider: 'anthropic',
			model: DEFAULT_MODEL,
			apiKey: '',
			prompts: [
				{
					slug: IMAGE_ALT_PROMPT_SLUG,
					label: 'Photo alt text',
					body: DEFAULT_IMAGE_ALT_PROMPT
				}
			]
		},
		lastfm: { username: '', apiKey: '' },
		email: { resendApiKey: '', fromAddress: '', fromName: '' }
	};
}

function viewFromDoc(doc: SiteSetting | null | undefined): SiteSettingsView {
	const base = emptySettings();
	if (!doc) return base;

	const ai = asRecord(doc.ai);
	const lastfm = asRecord(doc.lastfm);
	const email = asRecord(doc.email);
	if (ai) decryptGroupField(ai, 'apiKey');
	if (lastfm) decryptGroupField(lastfm, 'apiKey');
	if (email) decryptGroupField(email, 'resendApiKey');

	const provider = str(ai?.provider);
	const prompts = parsePrompts(ai?.prompts);

	return {
		ai: {
			provider: provider === 'openai' ? 'openai' : 'anthropic',
			model: str(ai?.model).trim() || base.ai.model,
			apiKey: str(ai?.apiKey),
			prompts: prompts.length ? prompts : base.ai.prompts
		},
		lastfm: {
			username: str(lastfm?.username),
			apiKey: str(lastfm?.apiKey)
		},
		email: {
			resendApiKey: str(email?.resendApiKey),
			fromAddress: str(email?.fromAddress),
			fromName: str(email?.fromName)
		}
	};
}

export async function loadSiteSettings(
	fetchFn: typeof fetch,
	request: Request
): Promise<SiteSettingsView> {
	const sdk = getPayloadSDK(fetchFn, request);
	try {
		const doc = await sdk.findGlobal({
			slug: 'site-settings',
			depth: 0
		});
		return viewFromDoc(doc);
	} catch (err) {
		if (err instanceof SettingsEncryptionError) throw err;
		return emptySettings();
	}
}

export async function saveSiteSettings(
	fetchFn: typeof fetch,
	request: Request,
	patch: SiteSettingsPatch
): Promise<SiteSettingsView> {
	const current = await loadSiteSettings(fetchFn, request);
	const view: SiteSettingsView = {
		ai: patch.ai ?? current.ai,
		lastfm: patch.lastfm ?? current.lastfm,
		email: patch.email ?? current.email
	};
	const payload: Record<string, unknown> = {
		ai: {
			provider: view.ai.provider,
			model: view.ai.model.trim(),
			apiKey: view.ai.apiKey,
			prompts: view.ai.prompts.map((row) => ({
				slug: row.slug.trim(),
				label: row.label.trim(),
				body: row.body,
				...(row.id ? { id: row.id } : {})
			}))
		},
		lastfm: {
			username: view.lastfm.username.trim(),
			apiKey: view.lastfm.apiKey
		},
		email: {
			resendApiKey: view.email.resendApiKey,
			fromAddress: view.email.fromAddress.trim(),
			fromName: view.email.fromName.trim()
		}
	};

	encryptGroupField(asRecord(payload.ai), 'apiKey');
	encryptGroupField(asRecord(payload.lastfm), 'apiKey');
	encryptGroupField(asRecord(payload.email), 'resendApiKey');

	const payloadFetch = createPayloadFetch(fetchFn, request);
	const base = getPayloadApiBaseUrl();
	const res = await payloadFetch(`${base}/globals/site-settings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(payload)
	});

	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			typeof body === 'object' &&
			body &&
			'errors' in body &&
			Array.isArray((body as { errors?: { message?: string }[] }).errors) &&
			typeof (body as { errors: { message?: string }[] }).errors[0]?.message === 'string'
				? (body as { errors: { message?: string }[] }).errors[0].message
				: typeof body === 'object' && body && typeof (body as { message?: string }).message === 'string'
					? (body as { message: string }).message
					: 'Failed to save settings';
		throw new Error(message);
	}

	const reloaded = await loadSiteSettings(fetchFn, request);
	if (!patch.ai || reloaded.ai.prompts.length >= view.ai.prompts.length) {
		return reloaded;
	}
	const loadedBySlug = new Map(
		reloaded.ai.prompts.map((row) => [row.slug.trim().toLowerCase(), row])
	);
	return {
		...reloaded,
		ai: {
			...reloaded.ai,
			prompts: view.ai.prompts.map((row) => {
				const match = loadedBySlug.get(row.slug.trim().toLowerCase());
				return match ? { ...row, id: match.id ?? row.id } : row;
			})
		}
	};
}

export type ResolvedAiSettings = {
	provider: 'anthropic' | 'openai';
	model: string;
	apiKey: string;
	systemPrompt: string;
};

export async function resolveAiSettings(
	fetchFn: typeof fetch,
	request: Request,
	promptSlug?: string
): Promise<ResolvedAiSettings> {
	let view: SiteSettingsView;
	try {
		view = await loadSiteSettings(fetchFn, request);
	} catch {
		view = emptySettings();
	}

	const envKey = env.ANTHROPIC_API_KEY?.trim() ?? '';
	const envModel = env.ANTHROPIC_MODEL?.trim() ?? '';
	const apiKey = view.ai.apiKey.trim() || envKey;
	const model = view.ai.model.trim() || envModel || DEFAULT_MODEL;
	const want = promptSlug?.trim();
	const systemPrompt = want
		? (getPrompt(view.ai.prompts, want) ?? '')
		: resolveImageAltPrompt(view.ai.prompts);

	return {
		provider: view.ai.provider,
		model,
		apiKey,
		systemPrompt
	};
}
