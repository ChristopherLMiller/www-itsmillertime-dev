import { getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import { getStoreConfig, getStoreProduct } from '$lib/medusa/store.server';
import type { GalleryImage } from '$lib/types/payload-types';
import { canAccessGallerySettings } from '$lib/utils/gallery-access';
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
		if (productId) {
			try {
				const product = await getStoreProduct(getStoreConfig(), productId);
				if (product?.variantId) {
					(doc as unknown as Record<string, unknown>).commerce = {
						forSale: true,
						productId: product.productId,
						variantId: product.variantId,
						priceUSD: product.priceUSD
					};
				}
			} catch {
				// Medusa not configured or unreachable: just omit commerce.
			}
		}
		return json(doc);
	}

	const payload = {
		thumbnailURL: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
		id: doc.id,
		blurhash: doc.blurhash ?? null,
		width: doc.sizes?.thumbnail?.width ?? doc.width ?? null,
		height: doc.sizes?.thumbnail?.height ?? doc.height ?? null,
		url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? doc.url ?? '',
		sizes: {
			thumbnail: {
				url: doc.sizes?.thumbnail?.url ?? doc.thumbnailURL ?? null,
				width: doc.sizes?.thumbnail?.width ?? null,
				height: doc.sizes?.thumbnail?.height ?? null
			}
		}
	};

	return json(payload);
};
