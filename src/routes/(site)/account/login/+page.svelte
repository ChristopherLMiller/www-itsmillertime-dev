<script lang="ts">
	import { dev } from '$app/environment';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Panel from '$lib/components/Panel';
	import { authClient } from '$lib/auth/client';
	import { hrefWithCallback } from '$lib/auth/returnTo';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let oauthError = $state<string | null>(null);
	let localError = $state<string | null>(null);
	let signingIn = $state(false);
	let needsTwoFactor = $state(false);
	let email = $state('');
	let password = $state('');
	let totp = $state('');

	function humanizeOAuthError(code: string): string {
		const messages: Record<string, string> = {
			access_denied: 'Access was denied by Authentik.',
			oauth_provider_not_found: 'Authentik is not configured. Please contact support.',
			oauth_code_verification_failed: 'Could not complete Authentik sign-in. Please try again.',
			state_mismatch: dev
				? 'Authentik cannot finish on localhost when this app talks to production CMS. Use email and password below (same as Payload local login).'
				: 'Login session expired or cookies were blocked. Please try again.',
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

	function humanizeLocalError(code: string | undefined, message: string | undefined): string {
		switch (code) {
			case 'INVALID_EMAIL_OR_PASSWORD':
				return 'Email or password is incorrect.';
			case 'EMAIL_NOT_VERIFIED':
				return 'This account’s email is not verified, so password login is blocked. Verify it in CMS, or use Authentik on a deployed environment.';
			case 'INVALID_CODE':
				return 'That authenticator code is not valid. Use the Payload/CMS 2FA item in 1Password (from when you enabled 2FA in CMS), not the Authentik one.';
			case 'INVALID_TWO_FACTOR_COOKIE':
				return 'Password was accepted, but the 2FA cookie was not stored. Sign in with email and password again, then enter a fresh code.';
			case 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE':
			case 'ACCOUNT_TEMPORARILY_LOCKED':
				return 'Too many attempts. Wait a moment and try again.';
			default:
				return message?.trim() || 'Could not sign in with email and password.';
		}
	}

	function localAuthError(code: string | undefined, message: string | undefined): string {
		const text = humanizeLocalError(code, message);
		return dev && code ? `${text} (${code})` : text;
	}

	onMount(() => {
		const code = page.url.searchParams.get('error');
		if (!code) return;
		oauthError = humanizeOAuthError(code);
	});

	async function finishLocalSignIn() {
		const session = await authClient.getSession();
		if (!session.data?.user) {
			localError =
				'CMS accepted the login, but this browser did not keep the session cookie. Check that cookies are allowed for localhost.';
			return;
		}
		window.location.assign(data.returnTo);
	}

	async function signInLocal(event: SubmitEvent) {
		event.preventDefault();
		if (signingIn) return;
		signingIn = true;
		localError = null;
		try {
			const result = await authClient.signIn.email({
				email: email.trim(),
				password
			});
			if (result.error) {
				localError = localAuthError(result.error.code, result.error.message);
				return;
			}
			if ((result.data as { twoFactorRedirect?: boolean } | undefined)?.twoFactorRedirect) {
				needsTwoFactor = true;
				totp = '';
				return;
			}
			await finishLocalSignIn();
		} catch (err) {
			localError =
				err instanceof Error ? err.message : 'Could not sign in with email and password.';
		} finally {
			signingIn = false;
		}
	}

	async function verifyTwoFactor(event: SubmitEvent) {
		event.preventDefault();
		if (signingIn) return;
		signingIn = true;
		localError = null;
		try {
			const code = totp.trim().replace(/\s/g, '');
			const result = /^\d{6,8}$/.test(code)
				? await authClient.twoFactor.verifyTotp({ code, trustDevice: true })
				: await authClient.twoFactor.verifyBackupCode({ code, trustDevice: true });
			if (result.error) {
				localError = localAuthError(result.error.code, result.error.message);
				return;
			}
			await finishLocalSignIn();
		} catch (err) {
			localError = err instanceof Error ? err.message : 'Could not verify authenticator code.';
		} finally {
			signingIn = false;
		}
	}

	function resetLocalSignIn() {
		needsTwoFactor = false;
		totp = '';
		localError = null;
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

			<a class="authentik-btn" href={startHref} data-sveltekit-reload>Continue with Authentik</a>

			{#if dev}
				<div class="local-divider" role="separator">or</div>
				<p class="local-lede">Dev only — Payload / Better Auth email and password</p>
				{#if localError}
					<div class="error-message" role="alert">
						<span>{localError}</span>
					</div>
				{/if}
				{#if needsTwoFactor}
					<p class="local-lede">Enter the authenticator code for {email}</p>
					<form class="local-form" onsubmit={verifyTwoFactor}>
						<label class="field" for="local-totp">
							<span>Authenticator or backup code</span>
							<input
								id="local-totp"
								type="text"
								name="totp"
								autocomplete="one-time-code"
								required
								bind:value={totp}
								disabled={signingIn}
							/>
						</label>
						<button type="submit" class="local-btn" disabled={signingIn}>
							{signingIn ? 'Verifying…' : 'Verify code'}
						</button>
						<button
							type="button"
							class="local-reset"
							disabled={signingIn}
							onclick={resetLocalSignIn}
						>
							Use a different account
						</button>
					</form>
				{:else}
					<form class="local-form" onsubmit={signInLocal}>
						<label class="field" for="local-email">
							<span>Email</span>
							<input
								id="local-email"
								type="email"
								name="email"
								autocomplete="username"
								required
								bind:value={email}
								disabled={signingIn}
							/>
						</label>
						<label class="field" for="local-password">
							<span>Password</span>
							<input
								id="local-password"
								type="password"
								name="password"
								autocomplete="current-password"
								required
								bind:value={password}
								disabled={signingIn}
							/>
						</label>
						<button type="submit" class="local-btn" disabled={signingIn}>
							{signingIn ? 'Signing in…' : 'Sign in with email'}
						</button>
					</form>
				{/if}
			{/if}
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

	.authentik-btn,
	.local-btn {
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

		&:hover:not(:disabled) {
			background: var(--color-primary-darker);
			border-color: var(--color-primary-darker);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.local-btn {
		background: transparent;
		color: var(--color-primary-darker);
	}

	.local-btn:hover:not(:disabled) {
		background: var(--color-white-darker);
		border-color: var(--color-primary);
		color: var(--color-primary-darker);
	}

	.local-reset {
		border: 0;
		padding: 0;
		background: transparent;
		color: var(--color-tertiary);
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		text-decoration: underline;
		cursor: pointer;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.local-divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		font-family: var(--font-special-elite);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.local-divider::before,
	.local-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-tertiary-lightest);
	}

	.local-lede {
		margin: 0;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		text-align: center;
	}

	.local-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		width: 100%;
		font-family: var(--font-special-elite);
		font-size: 0.75rem;
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		text-transform: none;
		letter-spacing: normal;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		transition: border-color 0.2s ease;
		box-sizing: border-box;

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}

		&:disabled {
			opacity: 0.6;
		}
	}
</style>
