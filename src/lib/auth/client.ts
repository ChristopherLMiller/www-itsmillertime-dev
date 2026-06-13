import { createAuthClient } from 'better-auth/svelte';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { browser } from '$app/environment';

export const authClient = createAuthClient({
	baseURL: browser ? `${window.location.origin}/api/auth` : 'http://localhost/api/auth',
	plugins: [twoFactorClient(), passkeyClient()]
});
