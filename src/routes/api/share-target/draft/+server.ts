import { readDraftFile, SHARE_TARGET_DRAFT_COOKIE } from '$lib/share-target-draft.server';
import { error, type RequestHandler } from '@sveltejs/kit';

/** Private preview of the pending share (requires draft cookie). */
export const GET: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SHARE_TARGET_DRAFT_COOKIE);
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
