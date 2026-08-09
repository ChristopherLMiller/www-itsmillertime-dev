<script lang="ts">
	import { onMount } from 'svelte';
	import { AUTHENTIK_PROVIDER_ID, authClient } from '$lib/auth/client';
	import Panel from '$lib/components/Panel';

	let loading = $state(false);
	let actionError = $state<string | null>(null);
	let oauthError = $state<string | null>(null);

	const error = $derived(actionError ?? oauthError);

	function humanizeOAuthError(code: string): string {
		const messages: Record<string, string> = {
			access_denied: 'Access was denied by Authentik.',
			oauth_provider_not_found: 'Authentik is not configured. Please contact support.',
			oauth_code_verification_failed: 'Could not complete Authentik sign-in. Please try again.',
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
		params.delete('error');
		params.delete('error_description');
		const query = params.toString();
		window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
	});

	async function signInWithAuthentik() {
		if (loading) return;
		loading = true;
		actionError = null;
		oauthError = null;

		const loginUrl = `${window.location.origin}/account/login`;
		const callbackURL = `${window.location.origin}/account/profile`;

		try {
			const result = await authClient.signIn.oauth2({
				providerId: AUTHENTIK_PROVIDER_ID,
				callbackURL,
				errorCallbackURL: loginUrl
			});

			if (result.error) {
				actionError = result.error.message || 'Authentik sign-in failed.';
				loading = false;
				return;
			}

			const data = result.data as { url?: string; redirect?: boolean } | undefined;
			if (data?.url) {
				window.location.href = data.url;
				return;
			}
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Authentik sign-in failed.';
			loading = false;
		}
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

			{#if error}
				<div class="error-message" role="alert">
					<span>{error}</span>
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
