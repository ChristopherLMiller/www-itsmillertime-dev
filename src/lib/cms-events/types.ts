/** Payload plugin `payload-plugin-webhooks` event (CMS `/api/webhooks/stream`). */
export type WebhookAction = 'create' | 'update' | 'delete' | 'read';

export type WebhookPayload = {
	action: WebhookAction;
	collection: string;
	data?: unknown;
	id?: number | string;
	previousData?: unknown;
	timestamp: string;
	type?: string;
	message?: string;
};

/**
 * Sanitized event sent to browsers. No document bodies — drafts must not leak.
 */
export type CmsContentEvent = {
	action: Exclude<WebhookAction, 'read'>;
	collection: string;
	id?: number | string;
	slug?: string;
	timestamp: string;
};
