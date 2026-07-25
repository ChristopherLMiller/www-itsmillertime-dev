import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields, twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { browser } from '$app/environment';

export const authClient = createAuthClient({
	baseURL: browser ? `${window.location.origin}/api/auth` : 'http://localhost/api/auth',
	plugins: [
		twoFactorClient(),
		passkeyClient(),
		inferAdditionalFields({
			user: {
				displayName: {
					type: 'string',
					required: false,
					input: true
				},
				nsfwFiltering: {
					type: 'string',
					required: false,
					input: true
				},
				bggUsername: {
					type: 'string',
					required: false,
					input: true
				}
			}
		})
	]
});
