import { dev } from '$app/environment';
import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import {
	DRAFT_MAX_BYTES,
	SHARE_TARGET_DRAFT_COOKIE,
	saveDraft
} from '$lib/share-target-draft.server';
import { isImageFile } from '$lib/share-target-payload-upload.server';
import { redirect, type RequestHandler } from '@sveltejs/kit';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function shareResultHtml(title: string, body: string, status: number): Response {
	const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title></head><body style="font-family:system-ui,sans-serif;padding:1.5rem;max-width:40rem;margin:auto"><h1 style="font-size:1.25rem">${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="/share-target">Share target</a> · <a href="/account/login">Sign in</a></p></body></html>`;
	return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export const POST: RequestHandler = async (event) => {
	const { request, cookies, url: pageUrl } = event;

	const user = await getMergedSessionUser(event);
	if (!user) {
		return shareResultHtml(
			'Sign in required',
			'Install or open this site, sign in as an administrator, then share photos again from your gallery. Shared files cannot be retried after this page.',
			401
		);
	}
	if (!isAdminRole(user)) {
		return shareResultHtml(
			'Not allowed',
			'Share to site is only available to administrators. Sign in with an admin account or upload from the CMS.',
			403
		);
	}

	const formData = await request.formData();
	const title = String(formData.get('title') ?? '').trim();
	const text = String(formData.get('text') ?? '').trim();
	const linkUrl = String(formData.get('url') ?? '').trim();

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

	const images = files.filter((f) => isImageFile(f));
	if (images.length === 0) {
		return shareResultHtml(
			'Unsupported files',
			'Only image types are accepted. Remove non-image items and try again.',
			400
		);
	}

	const file = images[0];
	const extraImagesDropped = Math.max(0, images.length - 1);

	const ab = await file.arrayBuffer();
	const buffer = Buffer.from(ab);
	if (buffer.byteLength > DRAFT_MAX_BYTES) {
		return shareResultHtml(
			'File too large',
			'This image is larger than the allowed upload size.',
			413
		);
	}

	let token: string;
	try {
		token = await saveDraft({
			buffer,
			meta: {
				originalName: file.name || 'shared-image',
				mimeType: file.type || 'application/octet-stream',
				shareTitle: title,
				shareText: text,
				shareUrl: linkUrl,
				extraImagesDropped
			}
		});
	} catch (e) {
		if (e instanceof Error && e.message === 'FILE_TOO_LARGE') {
			return shareResultHtml(
				'File too large',
				'This image is larger than the allowed upload size.',
				413
			);
		}
		return shareResultHtml('Could not save upload', 'Try sharing again in a moment.', 500);
	}

	cookies.set(SHARE_TARGET_DRAFT_COOKIE, token, {
		path: '/',
		maxAge: 15 * 60,
		sameSite: 'lax',
		httpOnly: true,
		secure: !dev
	});

	const next = new URL('/share-target/review', pageUrl);
	throw redirect(303, next.href);
};

/** Some clients probe the share action with GET; only POST receives shares. */
export const GET: RequestHandler = () => new Response(null, { status: 204 });
