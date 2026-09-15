import type { CmsContentEvent, WebhookPayload } from '$lib/cms-events/types';

function slugFromUnknown(value: unknown): string | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const slug = (value as { slug?: unknown }).slug;
	return typeof slug === 'string' && slug.length > 0 ? slug : undefined;
}

export function isWebhookPayload(value: unknown): value is WebhookPayload {
	if (!value || typeof value !== 'object') return false;
	const rec = value as Record<string, unknown>;
	return typeof rec.action === 'string' && typeof rec.collection === 'string';
}

/** Drop connected pings, reads, and anything we cannot safely expose. */
export function toPublicCmsEvent(value: unknown): CmsContentEvent | null {
	if (!isWebhookPayload(value)) return null;
	if (value.type === 'connected') return null;
	if (value.action === 'read') return null;
	if (
		value.action !== 'create' &&
		value.action !== 'update' &&
		value.action !== 'delete'
	) {
		return null;
	}
	if (!value.collection) return null;

	if (value.action !== 'delete') {
		const status =
			value.data && typeof value.data === 'object'
				? (value.data as { _status?: unknown })._status
				: undefined;
		if (status === 'draft') return null;
	}

	return {
		action: value.action,
		collection: value.collection,
		id: value.id,
		slug:
			slugFromUnknown(value) ??
			slugFromUnknown(value.data) ??
			slugFromUnknown(value.previousData),
		timestamp: value.timestamp || new Date().toISOString()
	};
}
