import { json } from '@sveltejs/kit';
import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
import { parseProductRequestBody } from '$lib/commerce/product-request';
import type { RequestHandler } from './$types';

/**
 * Proxies gallery shop waitlist submissions to Payload CMS.
 * Payload stores the request and emails support via Resend.
 */
export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const parsed = parseProductRequestBody(body);
	if (!parsed.ok) {
		return json({ error: parsed.error }, { status: 400 });
	}

	const res = await fetch(`${PUBLIC_PAYLOAD_URL}/api/gallery-product-request`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(parsed.data)
	});

	const data = (await res.json().catch(() => ({}))) as {
		error?: string;
		success?: boolean;
		duplicate?: boolean;
	};

	if (!res.ok) {
		return json({ error: data.error ?? 'Failed to save request' }, { status: res.status });
	}

	return json({ success: true, duplicate: Boolean(data.duplicate) });
};
