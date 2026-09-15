import { invalidate } from '$app/navigation';
import { browser } from '$app/environment';
import {
	queryKeysForCmsEvent,
	svelteInvalidationIdsForCmsEvent
} from '$lib/cms-events/queryKeysForEvent';
import { toPublicCmsEvent } from '$lib/cms-events/toPublicEvent';
import type { CmsContentEvent } from '$lib/cms-events/types';
import { invalidateCachedArticles } from '$lib/pwa/articleOfflineSync';
import type { QueryClient } from '@tanstack/svelte-query';

export function applyCmsContentEvent(queryClient: QueryClient, event: CmsContentEvent): void {
	for (const queryKey of queryKeysForCmsEvent(event)) {
		void queryClient.invalidateQueries({ queryKey: [...queryKey] });
	}

	for (const id of svelteInvalidationIdsForCmsEvent(event)) {
		void invalidate(id);
	}

	if (event.collection === 'posts') {
		invalidateCachedArticles(event.slug ? [event.slug] : undefined);
	}
}

export function subscribeToCmsEvents(queryClient: QueryClient): () => void {
	if (!browser) return () => {};

	const source = new EventSource('/api/cms-events');
	source.onmessage = (message) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(message.data);
		} catch {
			return;
		}
		if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'connected') {
			return;
		}
		const event = toPublicCmsEvent(parsed);
		if (!event) return;
		applyCmsContentEvent(queryClient, event);
	};

	return () => source.close();
}
