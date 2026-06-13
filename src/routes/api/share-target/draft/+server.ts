import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { readDraftFile, SHARE_TARGET_DRAFT_COOKIE } from '$lib/share-target/draft.server';
import { error, type RequestHandler } from '@sveltejs/kit';

/** Private preview of the pending share (requires draft cookie and admin role). */
export const GET: RequestHandler = async (event) => {
	const user = await getMergedSessionUser(event);
	if (!user || !isAdminRole(user)) {
		throw error(403, 'Forbidden');
	}

	const token = event.cookies.get(SHARE_TARGET_DRAFT_COOKIE);
	const draft = await readDraftFile(token);
	if (!draft) {
		throw error(404, 'Not found');
	}
	return new Response(new Uint8Array(draft.buffer), {
		headers: {
			'content-type': draft.meta.mimeType || 'application/octet-stream',
			'cache-control': 'private, no-store'
		}
	});
};
