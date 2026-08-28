import { getMergedSessionUser } from '$lib/auth/requireAdmin.server';
import { getStoreConfig, getStoreProduct } from '$lib/medusa/store.server';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { GalleryImage } from '$lib/types/payload-types';
import { canAccessGallerySettings } from '$lib/utils/gallery-access';
import { commerceFromStoreProduct, stampPrintPixelsAndRedactMaster } from '$lib/utils/gallery-image-display';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_IDS = 12;

/**
 * Batch gallery-image docs for the album grid / lightbox.
 * `GET ?ids=1,2,3&data=basic` → depth 0 upload fields (grid polaroids; no Medusa).
 * `GET ?ids=1,2,3&data=full` → depth 1 + Medusa commerce (lightbox).
 * Missing / inaccessible ids are omitted (not 404 for the whole batch).
 */
export const GET: RequestHandler = async (event) => {
	const { url, fetch, request } = event;
	const rawIds = url.searchParams.get('ids') ?? '';
	const ids = [
		...new Set(
			rawIds
				.split(',')
				.map((s) => Number(s.trim()))
				.filter((n) => Number.isFinite(n) && n > 0)
		)
	].slice(0, MAX_IDS);

	if (ids.length === 0) {
		return json({ error: 'ids query required (comma-separated)' }, { status: 400 });
	}

	const raw = url.searchParams.get('data')?.toLowerCase() ?? 'full';
	if (raw !== 'basic' && raw !== 'full') {
		return json({ error: 'Invalid data parameter; use basic or full' }, { status: 400 });
	}
	const wantFull = raw === 'full';

	const user = await getMergedSessionUser(event);
	const sdk = getPayloadSDK(fetch, request);

	const result = await sdk.find({
		collection: 'gallery-images',
		where: {
			id: {
				in: ids
			}
		},
		limit: ids.length,
		depth: wantFull ? 1 : 0,
		pagination: false
	});

	const allowed = (result.docs ?? []).filter((doc) =>
		canAccessGallerySettings(doc.settings, user)
	) as GalleryImage[];

	if (wantFull) {
		await Promise.all(
			allowed.map(async (doc) => {
				const productId = (doc as { medusaProductId?: string | null }).medusaProductId;
				let commerce = null;
				if (productId) {
					try {
						const product = await getStoreProduct(getStoreConfig(), productId);
						commerce = product ? commerceFromStoreProduct(product) : null;
					} catch {
						/* Medusa optional */
					}
				}
				(doc as unknown as Record<string, unknown>).commerce = commerce;
				stampPrintPixelsAndRedactMaster(doc as unknown as Record<string, unknown>);
			})
		);
	}

	// Preserve request order so clients can zip against their id list.
	const byId = new Map(allowed.map((doc) => [doc.id, doc]));
	const docs = ids.map((id) => byId.get(id)).filter((d): d is GalleryImage => d != null);

	return json({ docs });
};
