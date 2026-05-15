import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { readDraftMeta, SHARE_TARGET_DRAFT_COOKIE } from '$lib/share-target-draft.server';
import {
	parseShareTargetDestination,
	SHARE_TARGET_DEST_COOKIE,
	SHARE_TARGET_FLASH_COOKIE
} from '$lib/share-target-destination';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { cookies } = event;

	const mergedUser = await getMergedSessionUser(event);
	const session = mergedUser ? { user: mergedUser } : null;
	const canUseShareTarget = mergedUser !== null && isAdminRole(mergedUser);

	const destination = parseShareTargetDestination(cookies.get(SHARE_TARGET_DEST_COOKIE));

	let flashErrors: string[] = [];
	const flashRaw = cookies.get(SHARE_TARGET_FLASH_COOKIE);
	if (flashRaw) {
		cookies.delete(SHARE_TARGET_FLASH_COOKIE, { path: '/' });
		try {
			const parsed = JSON.parse(flashRaw) as { errors?: unknown };
			if (parsed?.errors && Array.isArray(parsed.errors)) {
				flashErrors = parsed.errors.map((e) => String(e));
			}
		} catch {
			/* ignore */
		}
	}

	const hasDraft =
		canUseShareTarget && Boolean(await readDraftMeta(cookies.get(SHARE_TARGET_DRAFT_COOKIE)));

	return {
		session,
		canUseShareTarget,
		destination,
		flashErrors,
		hasDraft
	};
};
