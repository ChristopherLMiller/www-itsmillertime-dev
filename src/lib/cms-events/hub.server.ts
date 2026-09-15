import { env } from '$env/dynamic/private';
import { invalidateLayoutServerCache } from '$lib/cache/layoutCache.server';
import { shouldBustLayoutServerCache } from '$lib/cms-events/queryKeysForEvent';
import { toPublicCmsEvent } from '$lib/cms-events/toPublicEvent';
import type { CmsContentEvent } from '$lib/cms-events/types';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';

type HubListener = (event: CmsContentEvent) => void;

const listeners = new Set<HubListener>();
let started = false;
let abort: AbortController | null = null;

function webhookApiKey(): string {
	return env.PAYLOAD_WEBHOOK_API_KEY?.trim() ?? '';
}

function streamUrl(): string {
	return `${getPayloadApiBaseUrl()}/webhooks/stream`;
}

function dispatch(event: CmsContentEvent): void {
	if (shouldBustLayoutServerCache(event) || event.collection === 'pages') {
		invalidateLayoutServerCache();
	}
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (error) {
			console.error('[cms-events] listener failed', error);
		}
	}
}

async function consumeSse(response: Response, signal: AbortSignal): Promise<void> {
	const reader = response.body?.getReader();
	if (!reader) throw new Error('CMS webhook stream has no body');

	const decoder = new TextDecoder();
	let buffer = '';

	while (!signal.aborted) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const frames = buffer.split('\n\n');
		buffer = frames.pop() ?? '';

		for (const frame of frames) {
			for (const line of frame.split('\n')) {
				if (!line.startsWith('data:')) continue;
				const raw = line.slice(5).trim();
				if (!raw) continue;
				try {
					const parsed: unknown = JSON.parse(raw);
					const event = toPublicCmsEvent(parsed);
					if (event) dispatch(event);
				} catch {
					// Ignore malformed frames (partial JSON, pings already stripped).
				}
			}
		}
	}
}

async function connectLoop(): Promise<void> {
	let delayMs = 1000;
	const maxDelayMs = 30_000;

	while (abort && !abort.signal.aborted) {
		const key = webhookApiKey();
		if (!key) {
			console.warn(
				'[cms-events] PAYLOAD_WEBHOOK_API_KEY is not set; live CMS invalidation is disabled'
			);
			return;
		}

		try {
			const response = await fetch(streamUrl(), {
				headers: {
					Accept: 'text/event-stream',
					'x-api-key': key
				},
				signal: abort.signal
			});

			if (!response.ok) {
				console.error(
					`[cms-events] CMS stream failed (${response.status}) ${streamUrl()}`
				);
			} else {
				delayMs = 1000;
				await consumeSse(response, abort.signal);
			}
		} catch (error) {
			if (abort.signal.aborted) return;
			console.error('[cms-events] CMS stream error', error);
		}

		if (abort.signal.aborted) return;
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		delayMs = Math.min(maxDelayMs, delayMs * 2);
	}
}

export function ensureCmsWebhookHub(): void {
	if (started) return;
	started = true;
	abort = new AbortController();
	void connectLoop();
}

export function subscribeCmsWebhookHub(listener: HubListener): () => void {
	ensureCmsWebhookHub();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
