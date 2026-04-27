import { json } from '@sveltejs/kit';
import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

/**
 * Proxies contact form submissions to Payload CMS.
 * Payload handles sending (via Resend) and can add to a job queue for processing.
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: { name?: string; email?: string; message?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { name, email, message } = body;

	if (!name?.trim() || !email?.trim() || !message?.trim()) {
		return json({ error: 'Name, email, and message are required' }, { status: 400 });
	}

	const res = await fetch(`${PUBLIC_PAYLOAD_URL}/api/contact-form`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() })
	});

	const data = await res.json().catch(() => ({}));

	if (!res.ok) {
		return json({ error: data.error ?? 'Failed to send message' }, { status: res.status });
	}

	return json({ success: true });
};
