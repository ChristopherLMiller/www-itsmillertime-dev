import { loadSessionFromEvent } from '$lib/auth/loadSession.server';
import { getPayloadApiBaseUrl } from '$lib/payload/api-base-url.server';
import { createPayloadFetch } from '$lib/payload';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NSFW_VALUES = new Set(['hide', 'blur', 'show'] as const);
type NsfwFiltering = 'hide' | 'blur' | 'show';

type ProfilePatchBody = {
	displayName?: string | null;
	nsfwFiltering?: NsfwFiltering | null;
	bggUsername?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBody(body: unknown): ProfilePatchBody {
	if (!isRecord(body)) {
		throw error(400, 'Invalid request body');
	}

	const data: ProfilePatchBody = {};

	if ('displayName' in body) {
		if (body.displayName === null) {
			data.displayName = null;
		} else if (typeof body.displayName === 'string') {
			data.displayName = body.displayName.trim() || null;
		} else {
			throw error(400, 'displayName must be a string or null');
		}
	}

	if ('nsfwFiltering' in body) {
		if (body.nsfwFiltering === null) {
			data.nsfwFiltering = null;
		} else if (
			typeof body.nsfwFiltering === 'string' &&
			NSFW_VALUES.has(body.nsfwFiltering as NsfwFiltering)
		) {
			data.nsfwFiltering = body.nsfwFiltering as NsfwFiltering;
		} else {
			throw error(400, 'nsfwFiltering must be hide, blur, show, or null');
		}
	}

	if ('bggUsername' in body) {
		if (body.bggUsername === null) {
			data.bggUsername = null;
		} else if (typeof body.bggUsername === 'string') {
			data.bggUsername = body.bggUsername.trim() || null;
		} else {
			throw error(400, 'bggUsername must be a string or null');
		}
	}

	if (Object.keys(data).length === 0) {
		throw error(400, 'No updatable fields provided');
	}

	return data;
}

export const GET: RequestHandler = async (event) => {
	const session = await loadSessionFromEvent(event);
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized');
	}

	return json({
		user: {
			id: session.user.id,
			email: session.user.email ?? null,
			name: session.user.name ?? null,
			displayName: session.user.displayName ?? null,
			nsfwFiltering: session.user.nsfwFiltering ?? null,
			bggUsername: session.user.bggUsername ?? null,
			image: session.user.image ?? null,
			role: session.user.role ?? null,
			emailVerified: session.user.emailVerified ?? null
		}
	});
};

export const PATCH: RequestHandler = async (event) => {
	const { request, fetch } = event;
	const session = await loadSessionFromEvent(event);
	const userIdRaw = session?.user?.id;
	if (userIdRaw == null) {
		throw error(401, 'Unauthorized');
	}

	const userId = Number(userIdRaw);
	if (!Number.isFinite(userId)) {
		throw error(400, 'Invalid user id');
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const data = parseBody(raw);
	const payloadFetch = createPayloadFetch(fetch, request);
	const base = getPayloadApiBaseUrl();

	const res = await payloadFetch(`${base}/users/${userId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(data)
	});

	const payload = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			typeof payload === 'object' &&
			payload &&
			'errors' in payload &&
			Array.isArray(payload.errors) &&
			typeof payload.errors[0]?.message === 'string'
				? payload.errors[0].message
				: typeof payload === 'object' && payload && typeof payload.message === 'string'
					? payload.message
					: 'Failed to update profile';
		return json({ error: message }, { status: res.status });
	}

	return json({ user: payload?.doc ?? payload });
};
