export type ProductRequestFields = {
	name: string;
	email: string;
	galleryImageId: number;
	albumSlug: string | null;
};

export type ProductRequestParseResult =
	{ ok: true; data: ProductRequestFields } | { ok: false; error: string };

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SLUG = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function singleLine(value: unknown): string {
	if (typeof value !== 'string') return '';
	return value.replace(/\s+/g, ' ').trim();
}

/**
 * Validate a waitlist POST body before proxying to Payload.
 * Payload still sanitizes; this is a fast fail for the storefront.
 */
export function parseProductRequestBody(body: unknown): ProductRequestParseResult {
	if (!isRecord(body)) return { ok: false, error: 'Invalid request body' };

	const name = singleLine(body.name).slice(0, MAX_NAME);
	const email = singleLine(body.email).toLowerCase().slice(0, MAX_EMAIL);
	const galleryImageId = Number(body.galleryImageId);
	const albumSlugRaw = singleLine(body.albumSlug).toLowerCase().slice(0, MAX_SLUG);

	if (!name) return { ok: false, error: 'Name is required' };
	if (!email) return { ok: false, error: 'Email is required' };
	if (!EMAIL_RE.test(email) || /[<>]/.test(email)) {
		return { ok: false, error: 'Invalid email address' };
	}
	if (!Number.isInteger(galleryImageId) || galleryImageId <= 0) {
		return { ok: false, error: 'Invalid gallery image id' };
	}

	let albumSlug: string | null = null;
	if (albumSlugRaw) {
		if (!SLUG_RE.test(albumSlugRaw)) return { ok: false, error: 'Invalid album slug' };
		albumSlug = albumSlugRaw;
	}

	return { ok: true, data: { name, email, galleryImageId, albumSlug } };
}
