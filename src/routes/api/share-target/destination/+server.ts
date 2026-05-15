import { dev } from '$app/environment';
import {
	encodeShareTargetDestination,
	SHARE_TARGET_DEST_COOKIE,
	type ShareTargetDestination
} from '$lib/share-target-destination';
import { json, type RequestHandler } from '@sveltejs/kit';

function readBody(body: unknown): ShareTargetDestination | null {
	if (!body || typeof body !== 'object') return null;
	const o = body as { mode?: unknown };
	if (o.mode === 'media') return { mode: 'media' };
	if (o.mode === 'gallery-image') return { mode: 'gallery-image' };
	return null;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	let parsed: unknown;
	try {
		parsed = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const dest = readBody(parsed);
	if (!dest) {
		return json(
			{ error: 'Body must be { mode: "media" } or { mode: "gallery-image" }' },
			{ status: 400 }
		);
	}

	const value = encodeShareTargetDestination(dest);
	cookies.set(SHARE_TARGET_DEST_COOKIE, value, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax',
		httpOnly: true,
		secure: !dev
	});

	return json({ ok: true, destination: dest });
};
