import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { createPayloadFetch, createPayloadInnerFetch } from '$lib/payload';
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

export const load: PageServerLoad = async ({ cookies, fetch, request }) => {
	const token = cookies.get(SHARE_TARGET_DRAFT_COOKIE);
	const draftMeta = await readDraftMeta(token);
	if (!draftMeta) {
		throw redirect(303, '/share-target');
	}

	const suggestedAlt = suggestedAltFromDraft(draftMeta);

	const sessionResponse = await fetch('/api/auth/get-session');
	const session = sessionResponse.ok ? await sessionResponse.json() : null;

	if (!session?.user) {
		return {
			session: null,
			draft: draftMeta,
			albums: [] as Pick<GalleryAlbum, 'id' | 'title' | 'slug'>[],
			destination: { mode: 'media' } as ShareTargetDestination,
			suggestedAlt
		};
	}

	const payloadFetch = createPayloadFetch(fetch, request);
	const meResponse = await payloadFetch(`${PUBLIC_PAYLOAD_API_ENDPOINT}/users/me`);
	const payloadMe = meResponse.ok ? await meResponse.json() : null;
	if (payloadMe?.user) {
		session.user = { ...session.user, ...payloadMe.user };
	}

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
	upload: async ({ request, cookies, fetch }) => {
		const sessionRes = await fetch('/api/auth/get-session');
		const session = sessionRes.ok ? ((await sessionRes.json()) as { user?: unknown }) : null;
		if (!session?.user) {
			return fail(401, { error: 'Sign in to upload.' });
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
				return fail(400, { error: 'Choose an album for gallery uploads.' });
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
