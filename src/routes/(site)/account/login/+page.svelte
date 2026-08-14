<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import Panel from '$lib/components/Panel';

	let loading = $state(false);
	let oauthError = $state<string | null>(null);

	function humanizeOAuthError(code: string): string {
		const messages: Record<string, string> = {
			access_denied: 'Access was denied by Authentik.',
			oauth_provider_not_found: 'Authentik is not configured. Please contact support.',
			oauth_code_verification_failed: 'Could not complete Authentik sign-in. Please try again.',
			state_mismatch: 'Login session expired or cookies were blocked. Please try again.',
			account_not_linked:
				'Your email already exists but could not be linked to Authentik. Please contact support.',
			user_info_is_missing: 'Authentik did not return user information.',
			email_is_missing: 'Authentik did not share an email address.',
			unable_to_link_account: 'Could not link this Authentik account to an existing user.'
		};
		return messages[code] ?? `Sign-in failed (${code}). Please try again.`;
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('error');
		if (!code) return;

		oauthError = humanizeOAuthError(code);
		// Keep ?error= visible for debugging / support screenshots.
	});

	function signInWithAuthentik() {
		if (loading) return;
		loading = true;
		oauthError = null;

		const loginUrl = `${window.location.origin}/account/login`;
		const callbackURL = `${window.location.origin}/account/profile`;

		// Start OAuth on the CMS origin so state + session cookies stay first-party with
		// the Authentik redirect_uri (cms callback). Shared Domain=.itsmillertime.dev
		// then makes the session visible on www after redirect back.
		const start = new URL(`${PUBLIC_PAYLOAD_URL}/api/frontend-oauth-start`);
		start.searchParams.set('callbackURL', callbackURL);
		start.searchParams.set('errorCallbackURL', loginUrl);
		window.location.href = start.toString();
	}
</script>

<svelte:head>
	<title>Sign In | itsMillerTime.dev</title>
</svelte:head>

<div class="login-container">
	<Panel hasPadding={true} hasBorder={true}>
		<div class="login-content">
			<h1>Sign In</h1>
			<p class="subtitle">Sign in with your itsmillertime.dev identity</p>

			{#if oauthError}
				<div class="error-message" role="alert">
					<span>{oauthError}</span>
				</div>
			{/if}

			<button
				type="button"
				class="authentik-btn"
				onclick={signInWithAuthentik}
				disabled={loading}
			>
				{loading ? 'Redirecting to Authentik…' : 'Continue with Authentik'}
			</button>
		</div>
	</Panel>
</div>

<style lang="postcss">
	.login-container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-block: 3rem;
	}

	.login-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		min-width: min(400px, 90vw);
	}

	h1 {
		font-family: var(--font-permanent-marker);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0;
	}

	.subtitle {
		font-family: var(--font-special-elite);
		font-size: var(--fs-base);
		color: var(--color-tertiary);
		margin: 0 0 0.5rem;
		text-align: center;
	}

	.error-message {
		background-color: oklch(0.9 0.05 25);
		border: 1px solid var(--color-primary);
		color: var(--color-primary-darker);
		padding: 0.75rem 1rem;
		border-radius: 4px;
		width: 100%;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		box-sizing: border-box;
	}

	.authentik-btn {
		width: 100%;
		padding: 0.75rem 1.5rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			background: var(--color-primary-darker);
			border-color: var(--color-primary-darker);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}
</style>
