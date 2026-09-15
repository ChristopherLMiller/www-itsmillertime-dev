import { subscribeCmsWebhookHub } from '$lib/cms-events/hub.server';
import type { RequestHandler } from './$types';

function encodeSse(data: unknown): Uint8Array {
	return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export const GET: RequestHandler = ({ request }) => {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(new TextEncoder().encode(': ping\n\n'));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30_000);

			let unsubscribe: (() => void) | null = null;

			const cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe?.();
				unsubscribe = null;
				try {
					controller.close();
				} catch {
					// already closed
				}
			};

			try {
				controller.enqueue(encodeSse({ type: 'connected' }));
			} catch {
				cleanup();
				return;
			}

			unsubscribe = subscribeCmsWebhookHub((event) => {
				try {
					controller.enqueue(encodeSse(event));
				} catch {
					cleanup();
				}
			});

			request.signal.addEventListener('abort', cleanup, { once: true });
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
