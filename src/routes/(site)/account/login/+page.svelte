<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import Panel from '$lib/Panel.svelte';

	type Step = 'login' | '2fa';

	let step = $state<Step>(($page.url.searchParams.get('step') as Step) || 'login');
	let loading = $state<string | null>(null);
	let error = $state<string | null>(null);

	let email = $state('');
	let password = $state('');
	let totpCode = $state('');

	async function signInWithEmail(e: SubmitEvent) {
		const form = e.currentTarget as HTMLFormElement;
		email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value ?? email;
		password = (form.querySelector('[name="password"]') as HTMLInputElement)?.value ?? password;

		if (!email || !password) {
			error = 'Please enter your email and password.';
			return;
		}

		loading = 'email';
		error = null;

		const result = await authClient.signIn.email({
			callbackURL: '/account/profile',
			email,
			password,
		});

		if ((result.data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
			step = '2fa';
			loading = null;
			return;
		}

		if (result.data?.user) {
			window.location.href = '/account/profile';
			return;
		}

		if (result.error) {
			if (result.error.status === 302 || result.error.message?.toLowerCase().includes('two factor')) {
				step = '2fa';
				loading = null;
				return;
			}
			error = result.error.message ?? 'Invalid email or password.';
		}

		loading = null;
	}

	async function verifyTOTP(e: SubmitEvent) {
		const form = e.currentTarget as HTMLFormElement;
		totpCode = (form.querySelector('[name="totp"]') as HTMLInputElement)?.value ?? totpCode;

		if (!totpCode || totpCode.length !== 6) {
			error = 'Please enter your 6-digit verification code.';
			return;
		}

		loading = '2fa';
		error = null;

		try {
			const result = await authClient.twoFactor.verifyTotp({
				code: totpCode
			});

			if (result.error) {
				error = result.error.message ?? 'Invalid verification code.';
				loading = null;
				return;
			}

			window.location.href = '/account/profile';
		} catch (err) {
			console.error('[verifyTOTP] Exception:', err);
			error = err instanceof Error ? err.message : 'Something went wrong verifying your code.';
			loading = null;
		}
	}

	async function signInWithPasskey() {
		loading = 'passkey';
		error = null;

		const { error: passkeyError } = await authClient.signIn.passkey({
			fetchOptions: {
				onSuccess() {
					goto('/account/profile');
				}
			}
		});

		if (passkeyError) {
			error = passkeyError.message ?? 'Passkey authentication failed.';
		}

		loading = null;
	}

	async function signInWith(provider: 'github' | 'discord') {
		loading = provider;
		error = null;

		try {
			const res = await fetch('/api/auth/sign-in/social', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider,
					callbackURL: `${window.location.origin}/account/profile`
				})
			});

			const data = await res.json();

			if (data.url) {
				window.location.href = data.url;
			} else if (data.error) {
				error = data.error;
				loading = null;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
			loading = null;
		}
	}

	function backToLogin() {
		step = 'login';
		error = null;
		totpCode = '';
	}
</script>

<svelte:head>
	<title>Sign In | itsMillerTime.dev</title>
</svelte:head>

<div class="login-container">
	<Panel hasPadding={true} hasBorder={true}>
		<div class="login-content">
			{#if step === '2fa'}
				<h1>Two-Factor Auth</h1>
				<p class="subtitle">Enter the code from your authenticator app</p>

				{#if error}
					<div class="error-message" role="alert">
						<span>{error}</span>
					</div>
				{/if}

			<form class="email-form" onsubmit={(e) => { e.preventDefault(); verifyTOTP(e); }}>
				<input
						type="text"
						name="totp"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder="000000"
						maxlength={6}
						bind:value={totpCode}
						class="totp-input"
						disabled={loading !== null}
					/>
					<button type="submit" class="submit-btn" disabled={loading !== null}>
						{loading === '2fa' ? 'Verifying...' : 'Verify'}
					</button>
				</form>

				<button class="back-link" onclick={backToLogin} disabled={loading !== null}>
					Back to sign in
				</button>
			{:else}
				<h1>Sign In</h1>
				<p class="subtitle">Sign in to your account</p>

				{#if error}
					<div class="error-message" role="alert">
						<span>{error}</span>
					</div>
				{/if}

			<form class="email-form" onsubmit={(e) => { e.preventDefault(); signInWithEmail(e); }}>
				<input
						type="email"
						name="email"
						autocomplete="username webauthn"
						placeholder="Email"
						bind:value={email}
						disabled={loading !== null}
					/>
				<input
						type="password"
						name="password"
						autocomplete="current-password"
						placeholder="Password"
						bind:value={password}
						disabled={loading !== null}
					/>
					<button type="submit" class="submit-btn" disabled={loading !== null}>
						{loading === 'email' ? 'Signing in...' : 'Sign In'}
					</button>
				</form>

				<div class="divider">
					<span>or</span>
				</div>

				<button
					class="provider-btn passkey"
					onclick={signInWithPasskey}
					disabled={loading !== null}
				>
					<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
						<circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
					</svg>
					<span>{loading === 'passkey' ? 'Waiting for passkey...' : 'Sign in with Passkey'}</span>
				</button>

				<div class="divider">
					<span>or</span>
				</div>

				<div class="providers">
					<button
						class="provider-btn github"
						onclick={() => signInWith('github')}
						disabled={loading !== null}
					>
						<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
							<path
								fill="currentColor"
								d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
							/>
						</svg>
						<span>{loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}</span>
					</button>

					<button
						class="provider-btn discord"
						onclick={() => signInWith('discord')}
						disabled={loading !== null}
					>
						<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
							<path
								fill="currentColor"
								d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"
							/>
						</svg>
						<span>{loading === 'discord' ? 'Redirecting...' : 'Continue with Discord'}</span>
					</button>
				</div>
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
	}

	.email-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.email-form input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		transition: border-color 0.2s ease;
		box-sizing: border-box;

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}

		&::placeholder {
			color: var(--color-tertiary-lighter);
		}

		&:disabled {
			opacity: 0.6;
		}
	}

	.totp-input {
		text-align: center;
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-s);
		letter-spacing: 0.5em;
	}

	.submit-btn {
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

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		color: var(--color-tertiary-lighter);
		font-family: var(--font-special-elite);
		font-size: var(--fs-xs);

		&::before,
		&::after {
			content: '';
			flex: 1;
			height: 1px;
			background: var(--color-tertiary-lighter);
		}
	}

	.providers {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.provider-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1.5rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);

		&:hover:not(:disabled) {
			border-color: var(--color-primary);
			box-shadow: var(--box-shadow-elev-1);
			transform: translateY(-1px);
		}

		&:active:not(:disabled) {
			transform: translateY(0);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		& svg {
			flex-shrink: 0;
		}
	}

	.provider-btn.passkey:hover:not(:disabled) {
		border-color: var(--color-secondary);
	}

	.provider-btn.github:hover:not(:disabled) {
		border-color: #333;
	}

	.provider-btn.discord:hover:not(:disabled) {
		border-color: #5865f2;
	}

	.back-link {
		background: none;
		border: none;
		color: var(--color-primary);
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		cursor: pointer;
		text-decoration: underline;
		padding: 0.25rem;

		&:hover {
			color: var(--color-primary-darker);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}
</style>
