<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Panel from '$lib/components/Panel';
	import { hrefWithCallback } from '$lib/auth/returnTo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
			unable_to_link_account: 'Could not link this Authentik account to an existing user.',
			unable_to_create_session:
				'Authentik succeeded, but this browser blocked the sign-in cookie. Please try again.'
		};
		return messages[code] ?? `Sign-in failed (${code}). Please try again.`;
	}

	const startHref = $derived(hrefWithCallback('/account/login/authentik', data.returnTo));

	onMount(() => {
		const code = page.url.searchParams.get('error');
		if (!code) return;
		oauthError = humanizeOAuthError(code);
	});
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

			<a class="authentik-btn" href={startHref} data-sveltekit-reload>Continue with Authentik</a>
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
		display: block;
		width: 100%;
		padding: 0.75rem 1.5rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		font-weight: 500;
		text-align: center;
		text-decoration: none;
		box-sizing: border-box;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: var(--color-primary-darker);
			border-color: var(--color-primary-darker);
		}
	}
</style>
