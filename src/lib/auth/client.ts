import { createAuthClient } from 'better-auth/svelte';
import { genericOAuthClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { browser } from '$app/environment';
import { AUTHENTIK_PROVIDER_ID } from '$lib/auth/authentik-constants';

export { AUTHENTIK_PROVIDER_ID };

export const authClient = createAuthClient({
	baseURL: browser ? `${window.location.origin}/api/auth` : 'http://localhost/api/auth',
	plugins: [
		genericOAuthClient(),
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
