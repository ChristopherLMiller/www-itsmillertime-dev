import {
	SuggestImageAltError,
	fetchGalleryPreviewBytes,
	jpegPreviewFromBytes,
	parseAlbumTitle,
	pickGalleryPreviewPath,
	suggestImageAlt
} from '$lib/ai/suggest-image-alt.server';
import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { createPayloadFetch } from '$lib/payload';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { parsePromptSlug } from '$lib/settings/prompts';
import { resolveAiSettings } from '$lib/settings/site-settings.server';
import { mediaRequiresAuthProxy } from '$lib/utils/gallery-access';
import { isVideoMedia } from '$lib/utils/media-url';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Admin-only: vision model suggests alt text for a gallery image.
 * Does not save — the lightbox inserts into the title field on confirm.
 */
export const POST: RequestHandler = async (event) => {
	const { params, fetch, request } = event;
	const galleryImageId = Number(params.id);
	if (!Number.isFinite(galleryImageId)) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	const user = await getMergedSessionUser(event);
	if (!isAdminRole(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	let albumTitle: string | undefined;
	let promptSlug: string | undefined;
	try {
		const body = await request.json();
		const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
		albumTitle = parseAlbumTitle(rec.albumTitle);
		promptSlug = parsePromptSlug(rec.promptSlug);
	} catch {
		albumTitle = undefined;
		promptSlug = undefined;
	}

	const sdk = getPayloadSDK(fetch, request);
	let doc;
	try {
		doc = await sdk.findByID({
			collection: 'gallery-images',
			id: galleryImageId,
			depth: 0,
			disableErrors: true
		});
	} catch {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (!doc) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (isVideoMedia(doc)) {
		return json({ error: 'Cannot suggest alt text for video' }, { status: 400 });
	}

	const path = pickGalleryPreviewPath(doc);
	if (!path) {
		return json({ error: 'This image has no file to analyze' }, { status: 422 });
	}

	let ai;
	try {
		ai = await resolveAiSettings(fetch, request, promptSlug);
	} catch {
		return json({ error: 'Could not load AI settings' }, { status: 503 });
	}
	if (promptSlug && !ai.systemPrompt) {
		return json({ error: 'Unknown prompt' }, { status: 400 });
	}
	if (!ai.apiKey) {
		return json({ error: 'AI alt suggestions are not configured' }, { status: 503 });
	}

	const payloadFetch = createPayloadFetch(fetch, request);

	try {
		const sourceBytes = await fetchGalleryPreviewBytes({
			path,
			restricted: mediaRequiresAuthProxy(doc.settings),
			apiBase: getPayloadApiBaseUrl(),
			fetchPublic: globalThis.fetch,
			fetchAuthenticated: payloadFetch
		});
		const jpeg = await jpegPreviewFromBytes(sourceBytes);
		const { alt } = await suggestImageAlt({
			jpegBytes: jpeg,
			albumTitle,
			apiKey: ai.apiKey,
			model: ai.model,
			systemPrompt: ai.systemPrompt,
			provider: ai.provider
		});
		return json({ alt });
	} catch (err) {
		if (err instanceof SuggestImageAltError) {
			return json({ error: err.message }, { status: err.status });
		}
		console.error('[suggest-alt]', err);
		return json({ error: 'Suggestion failed' }, { status: 500 });
	}
};
