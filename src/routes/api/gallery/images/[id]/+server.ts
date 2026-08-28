import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { getStoreConfig, getStoreProduct } from '$lib/medusa/store.server';
import type { GalleryImage } from '$lib/types/payload-types';
import { canAccessGallerySettings, mediaRequiresAuthProxy } from '$lib/utils/gallery-access';
import { commerceFromStoreProduct, stampPrintPixelsAndRedactMaster } from '$lib/utils/gallery-image-display';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Single gallery-image row from Payload.
 * `?data=basic` (default): thumbnail-shaped media, same shape as album hover preview.
 * `?data=full`: full gallery-image document at depth 1 (nested `image` media for lightbox / grid).
 */
export const GET: RequestHandler = async (event) => {
	const { params, url, fetch, request } = event;
	const galleryImageId = Number(params.id);
	if (!Number.isFinite(galleryImageId)) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	const raw = url.searchParams.get('data')?.toLowerCase() ?? 'basic';
	if (raw !== 'basic' && raw !== 'full') {
		return json({ error: 'Invalid data parameter; use basic or full' }, { status: 400 });
	}
	const wantFull = raw === 'full';

	const user = await getMergedSessionUser(event);
	const sdk = getPayloadSDK(fetch, request);

	let doc: GalleryImage | null;
	try {
		// Do not use Payload `select` on gallery-images (upload): it returns broken `sizes.*.url`
		// (see docs/gallery-album-page-unused-fields.md). Full document keeps correct URLs.
		doc = await sdk.findByID({
			collection: 'gallery-images',
			id: galleryImageId,
			depth: wantFull ? 1 : 0,
			disableErrors: true
		});
	} catch {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (!doc || !canAccessGallerySettings(doc.settings, user)) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (wantFull) {
		// Medusa is the source of truth for whether an image is for sale and its
		// price. We only carry a `medusaProductId` pointer in Payload; resolve the
		// live product (published + priced) so the lightbox can show a buy button.
		const productId = (doc as { medusaProductId?: string | null }).medusaProductId;
		let commerce = null;
		if (productId) {
			try {
				const product = await getStoreProduct(getStoreConfig(), productId);
				commerce = product ? commerceFromStoreProduct(product) : null;
			} catch {
				// Medusa not configured or unreachable: treat as not for sale.
			}
		}
		(doc as unknown as Record<string, unknown>).commerce = commerce;
		stampPrintPixelsAndRedactMaster(doc as unknown as Record<string, unknown>);
		return json(doc);
	}

	// Animated GIF size variants are often tall frame-strips — always prefer the original.
	const isGif =
		doc.mimeType === 'image/gif' || !!doc.filename?.toLowerCase().endsWith('.gif');
	const previewUrl = isGif
		? (doc.url ?? doc.thumbnailURL ?? '')
		: (doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? doc.url ?? '');

	const payload = {
		thumbnailURL: isGif
			? (doc.url ?? doc.thumbnailURL ?? null)
			: (doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null),
		id: doc.id,
		blurhash: doc.blurhash ?? null,
		mimeType: doc.mimeType ?? null,
		filename: doc.filename ?? null,
		width: isGif ? (doc.width ?? null) : (doc.sizes?.thumbnail?.width ?? doc.width ?? null),
		height: isGif ? (doc.height ?? null) : (doc.sizes?.thumbnail?.height ?? doc.height ?? null),
		url: previewUrl,
		/** Client uses this to route restricted bytes through `/api/media-proxy`. */
		needsProxy: mediaRequiresAuthProxy(doc.settings),
		isNsfw: doc.settings?.isNsfw === true,
		sizes: isGif
			? {}
			: {
					thumbnail: {
						url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
						width: doc.sizes?.thumbnail?.width ?? null,
						height: doc.sizes?.thumbnail?.height ?? null
					}
				}
	};

	return json(payload);
};

/**
 * Admin-only: update gallery-image `alt` and/or Lexical `caption` from the lightbox.
 */
export const PATCH: RequestHandler = async (event) => {
	const { params, fetch, request } = event;
	const galleryImageId = Number(params.id);
	if (!Number.isFinite(galleryImageId)) {
		return json({ error: 'Invalid gallery image ID' }, { status: 400 });
	}

	const user = await getMergedSessionUser(event);
	if (!isAdminRole(user)) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid body' }, { status: 400 });
	}

	const record = body as Record<string, unknown>;
	const data: { alt?: string; caption?: GalleryImage['caption'] | null } = {};

	if ('alt' in record) {
		if (record.alt != null && typeof record.alt !== 'string') {
			return json({ error: 'alt must be a string' }, { status: 400 });
		}
		data.alt = record.alt == null ? '' : String(record.alt);
	}

	if ('caption' in record) {
		if (
			record.caption !== null &&
			(typeof record.caption !== 'object' || Array.isArray(record.caption))
		) {
			return json({ error: 'caption must be a Lexical document or null' }, { status: 400 });
		}
		data.caption = (record.caption as GalleryImage['caption'] | null) ?? null;
	}

	if (!('alt' in data) && !('caption' in data)) {
		return json({ error: 'Provide alt and/or caption' }, { status: 400 });
	}

	const sdk = getPayloadSDK(fetch, request);
	try {
		const updated = await sdk.update({
			collection: 'gallery-images',
			id: galleryImageId,
			data,
			depth: 0
		});
		return json({
			id: updated.id,
			alt: updated.alt,
			caption: updated.caption ?? null
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Update failed';
		return json({ error: message }, { status: 500 });
	}
};
