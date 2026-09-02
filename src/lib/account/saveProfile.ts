import { authClient } from '$lib/auth/client';
import { authErrorMessage, jsonErrorMessage } from './authMessage';
import type { NsfwFiltering } from './types';

export type ProfilePatchBody = {
	name?: string;
	displayName?: string | null;
	nsfwFiltering?: NsfwFiltering | null;
	bggUsername?: string | null;
};

async function patchPayloadFields(body: Omit<ProfilePatchBody, 'name'>): Promise<void> {
	const res = await fetch('/api/account/profile', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(jsonErrorMessage(data, 'Failed to update profile fields'));
	}
}

/**
 * Persist site profile fields through Better Auth additional fields, with Payload REST
 * as a fallback so displayName / NSFW / BGG still save if updateUser rejects extras.
 */
export async function saveProfileFields(fields: ProfilePatchBody): Promise<void> {
	const additional: Record<string, unknown> = {};
	if (typeof fields.name === 'string') additional.name = fields.name;
	if ('displayName' in fields) additional.displayName = fields.displayName;
	if ('nsfwFiltering' in fields) additional.nsfwFiltering = fields.nsfwFiltering;
	if ('bggUsername' in fields) additional.bggUsername = fields.bggUsername;

	const payloadFields: Omit<ProfilePatchBody, 'name'> = {};
	if ('displayName' in fields) payloadFields.displayName = fields.displayName;
	if ('nsfwFiltering' in fields) payloadFields.nsfwFiltering = fields.nsfwFiltering;
	if ('bggUsername' in fields) payloadFields.bggUsername = fields.bggUsername;
	const hasPayloadFields = Object.keys(payloadFields).length > 0;

	const updateResult = Object.keys(additional).length
		? await authClient.updateUser(additional)
		: { error: null };

	if (!updateResult.error) {
		if (hasPayloadFields) {
			await patchPayloadFields(payloadFields);
		}
		return;
	}

	if (hasPayloadFields) {
		await patchPayloadFields(payloadFields);
		if (typeof fields.name === 'string') {
			throw new Error(authErrorMessage(updateResult.error, 'Could not update name.'));
		}
		return;
	}

	throw new Error(authErrorMessage(updateResult.error, 'Could not update account.'));
}
