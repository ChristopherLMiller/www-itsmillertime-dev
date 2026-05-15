import { dev } from '$app/environment';
import { createPayloadInnerFetch } from '$lib/payload';
import {
	parseShareTargetDestination,
	SHARE_TARGET_DEST_COOKIE,
	SHARE_TARGET_FLASH_COOKIE,
	type ShareTargetDestination
} from '$lib/share-target-destination';
import { redirect, type RequestHandler } from '@sveltejs/kit';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function shareResultHtml(title: string, body: string, status: number): Response {
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui,sans-serif;padding:1.5rem;max-width:40rem;margin:auto"><h1 style="font-size:1.25rem">${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="/share-target">Share target settings</a> · <a href="/account/login">Sign in</a></p></body></html>`;
	return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function altFromShareContext(
	file: File,
	title: string,
	text: string,
	url: string
): string {
	const combined = [title, text, url].map((s) => s.trim()).filter(Boolean).join(' — ');
	const base = combined || file.name.replace(/\.[^.]+$/, '') || 'Shared image';
	return base.length > 500 ? base.slice(0, 497) + '…' : base;
}

function isImageFile(f: File): boolean {
	if (typeof f.type === 'string' && f.type.startsWith('image/')) return true;
	const name = f.name.toLowerCase();
	return /\.(heic|heif|jpe?g|png|gif|webp|avif|bmp|tiff?)$/.test(name);
}

async function payloadCreateUpload(args: {
	innerFetch: typeof fetch;
	baseURL: string;
	collection: 'media' | 'gallery-images';
	file: File;
	payloadJson: Record<string, unknown>;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
	const formData = new FormData();
	formData.append('file', args.file);
	formData.append('_payload', JSON.stringify(args.payloadJson));

	const res = await args.innerFetch(`${args.baseURL.replace(/\/$/, '')}/${args.collection}`, {
		method: 'POST',
		body: formData,
		credentials: 'include'
	});

	let body: unknown;
	try {
		body = await res.json();
	} catch {
		return { ok: false, message: `HTTP ${res.status}` };
	}

	if (!res.ok) {
		const errObj = body as { errors?: { message?: string }[]; message?: string };
		const first = errObj.errors?.[0]?.message ?? errObj.message ?? `HTTP ${res.status}`;
		return { ok: false, message: first };
	}

	const doc = body as { doc?: { id?: number } };
	const id = doc.doc?.id;
	if (typeof id !== 'number') {
		return { ok: false, message: 'Unexpected response from CMS' };
	}
	return { ok: true, id };
}

function buildGalleryImagePayload(
	albumId: number,
	alt: string
): Record<string, unknown> {
	return {
		alt,
		settings: {
			visibility: 'AUTHENTICATED',
			isNsfw: false
		},
		albums: [albumId]
	};
}

function buildMediaPayload(alt: string): Record<string, unknown> {
	return { alt };
}

async function uploadForDestination(
	innerFetch: typeof fetch,
	baseURL: string,
	dest: ShareTargetDestination,
	file: File,
	alt: string
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
	if (dest.mode === 'media') {
		return payloadCreateUpload({
			innerFetch,
			baseURL,
			collection: 'media',
			file,
			payloadJson: buildMediaPayload(alt)
		});
	}
	return payloadCreateUpload({
		innerFetch,
		baseURL,
		collection: 'gallery-images',
		file,
		payloadJson: buildGalleryImagePayload(dest.albumId, alt)
	});
}

export const POST: RequestHandler = async ({ request, fetch, cookies }) => {
	const sessionRes = await fetch('/api/auth/get-session');
	const session = sessionRes.ok ? ((await sessionRes.json()) as { user?: unknown }) : null;
	if (!session?.user) {
		return shareResultHtml(
			'Sign in required',
			'Install or open this site, sign in, then share photos again from your gallery. Shared files cannot be retried after this page.',
			401
		);
	}

	const dest = parseShareTargetDestination(cookies.get(SHARE_TARGET_DEST_COOKIE));

	const formData = await request.formData();
	const title = String(formData.get('title') ?? '').trim();
	const text = String(formData.get('text') ?? '').trim();
	const url = String(formData.get('url') ?? '').trim();

	const rawFiles = formData.getAll('files');
	const files: File[] = [];
	for (const entry of rawFiles) {
		if (entry instanceof File && entry.size > 0) {
			files.push(entry);
		}
	}

	if (files.length === 0) {
		return shareResultHtml('No images received', 'The share did not include any image files.', 400);
	}

	const nonImages = files.filter((f) => !isImageFile(f));
	if (nonImages.length > 0) {
		return shareResultHtml(
			'Unsupported files',
			'Only image types are accepted. Remove non-image items and try again.',
			400
		);
	}

	const { innerFetch, baseURL } = createPayloadInnerFetch(fetch, request);

	let ok = 0;
	const errors: string[] = [];
	for (const file of files) {
		const alt = altFromShareContext(file, title, text, url);
		const result = await uploadForDestination(innerFetch, baseURL, dest, file, alt);
		if (result.ok) {
			ok += 1;
		} else {
			errors.push(`${file.name}: ${result.message}`);
		}
	}

	if (errors.length) {
		const payload = JSON.stringify({ errors: errors.slice(0, 12) });
		if (payload.length < 3500) {
			cookies.set(SHARE_TARGET_FLASH_COOKIE, payload, {
				path: '/',
				maxAge: 120,
				sameSite: 'lax',
				httpOnly: true,
				secure: !dev
			});
		}
	}

	const sp = new URLSearchParams();
	sp.set('uploaded', String(ok));
	if (errors.length) sp.set('failed', String(errors.length));

	throw redirect(303, `/share-target?${sp.toString()}`);
};
