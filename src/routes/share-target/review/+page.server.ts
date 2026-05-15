import { dev } from '$app/environment';
import { getMergedSessionUser, isAdminRole } from '$lib/auth/requireAdmin.server';
import { createPayloadInnerFetch } from '$lib/payload';
import { getPayloadSDK } from '$lib/payload.server';
import {
	deleteDraft,
	readDraftFile,
	readDraftMeta,
	SHARE_TARGET_DRAFT_COOKIE
} from '$lib/share-target-draft.server';
import { uploadForDestination } from '$lib/share-target-payload-upload.server';
import {
	parseShareTargetDestination,
	SHARE_TARGET_DEST_COOKIE,
	SHARE_TARGET_FLASH_COOKIE,
	type ShareTargetDestination
} from '$lib/share-target-destination';
import type { GalleryAlbum } from '$lib/types/payload-types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function suggestedAltFromDraft(draftMeta: {
	shareTitle: string;
	shareText: string;
	shareUrl: string;
	originalName: string;
}): string {
	const suggestedAlt =
		[draftMeta.shareTitle, draftMeta.shareText, draftMeta.shareUrl]
			.map((s) => s.trim())
			.filter(Boolean)
			.join(' — ') ||
		draftMeta.originalName.replace(/\.[^.]+$/, '') ||
		'Shared image';
	return suggestedAlt.length > 500 ? suggestedAlt.slice(0, 497) + '…' : suggestedAlt;
}

export const load: PageServerLoad = async (event) => {
	const { cookies, fetch, request } = event;
	const token = cookies.get(SHARE_TARGET_DRAFT_COOKIE);
	const draftMeta = await readDraftMeta(token);
	if (!draftMeta) {
		throw redirect(303, '/share-target');
	}

	const suggestedAlt = suggestedAltFromDraft(draftMeta);

	const mergedUser = await getMergedSessionUser(event);
	if (!mergedUser) {
		return {
			session: null,
			draft: draftMeta,
			albums: [] as Pick<GalleryAlbum, 'id' | 'title' | 'slug'>[],
			destination: { mode: 'media' } as ShareTargetDestination,
			suggestedAlt
		};
	}

	if (!isAdminRole(mergedUser)) {
		await deleteDraft(token);
		cookies.delete(SHARE_TARGET_DRAFT_COOKIE, { path: '/' });
		cookies.set(
			SHARE_TARGET_FLASH_COOKIE,
			JSON.stringify({
				errors: ['Share to site is only available to administrators.']
			}),
			{
				path: '/',
				maxAge: 180,
				sameSite: 'lax',
				httpOnly: true,
				secure: !dev
			}
		);
		throw redirect(303, '/share-target');
	}

	const session = { user: mergedUser };

	let albums: Pick<GalleryAlbum, 'id' | 'title' | 'slug'>[] = [];
	try {
		const sdk = getPayloadSDK(fetch, request);
		const res = await sdk.find({
			collection: 'gallery-albums',
			limit: 200,
			depth: 0,
			sort: 'title'
		});
		albums = res.docs.map((d) => ({
			id: d.id,
			title: d.title,
			slug: d.slug ?? null
		}));
	} catch {
		albums = [];
	}

	const destination = parseShareTargetDestination(cookies.get(SHARE_TARGET_DEST_COOKIE));

	return {
		session,
		draft: draftMeta,
		albums,
		destination,
		suggestedAlt
	};
};

export const actions = {
	upload: async (event) => {
		const { request, cookies, fetch } = event;

		const mergedUser = await getMergedSessionUser(event);
		if (!mergedUser) {
			return fail(401, { error: 'Sign in to upload.' });
		}
		if (!isAdminRole(mergedUser)) {
			return fail(403, { error: 'Only administrators can upload via Share to site.' });
		}

		const token = cookies.get(SHARE_TARGET_DRAFT_COOKIE);
		const draft = await readDraftFile(token);
		if (!draft) {
			cookies.delete(SHARE_TARGET_DRAFT_COOKIE, { path: '/' });
			return fail(400, {
				error:
					'This upload draft expired or was already submitted. Share the photo again from your gallery.'
			});
		}

		const fd = await request.formData();
		const alt = String(fd.get('alt') ?? '').trim();
		if (!alt) {
			return fail(400, { error: 'Title / alt text is required.' });
		}

		const modeRaw = String(fd.get('destinationMode') ?? 'media');
		const mode = modeRaw === 'gallery-image' ? 'gallery-image' : 'media';

		let dest: ShareTargetDestination;
		if (mode === 'gallery-image') {
			const albumId = Number.parseInt(String(fd.get('albumId') ?? ''), 10);
			if (!Number.isFinite(albumId) || albumId <= 0) {
				return fail(400, { error: 'Choose a gallery for gallery image uploads.' });
			}
			dest = { mode: 'gallery-image', albumId };
		} else {
			dest = { mode: 'media' };
		}

		const fileBody = new Blob([new Uint8Array(draft.buffer)], {
			type: draft.meta.mimeType || 'application/octet-stream'
		});

		const { innerFetch, baseURL } = createPayloadInnerFetch(fetch, request);
		const result = await uploadForDestination(
			innerFetch,
			baseURL,
			dest,
			fileBody,
			draft.meta.originalName,
			alt
		);

		if (!result.ok) {
			return fail(400, { error: result.message });
		}

		await deleteDraft(token);
		cookies.delete(SHARE_TARGET_DRAFT_COOKIE, { path: '/' });

		const kind = dest.mode === 'media' ? 'media' : 'gallery-image';
		throw redirect(303, `/share-target/complete?kind=${encodeURIComponent(kind)}&id=${result.id}`);
	}
} satisfies Actions;
