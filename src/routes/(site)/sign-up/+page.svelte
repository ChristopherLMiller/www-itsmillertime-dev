<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import Panel from '$lib/Panel.svelte';

	const session = authClient.useSession();

	let loading = $state(false);
	let error = $state<string | null>(null);

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	$effect(() => {
		if ($session.data?.user) {
			window.location.href = '/profile';
		}
	});

	async function signUp(e: SubmitEvent) {
		const form = e.currentTarget as HTMLFormElement;
		name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value ?? name;
		email = (form.querySelector('[name="email"]') as HTMLInputElement)?.value ?? email;
		password = (form.querySelector('[name="password"]') as HTMLInputElement)?.value ?? password;
		confirmPassword =
			(form.querySelector('[name="confirmPassword"]') as HTMLInputElement)?.value ?? confirmPassword;

		if (!name || !email || !password || !confirmPassword) {
			error = 'Please fill in all fields.';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		loading = true;
		error = null;

		try {
			const result = await authClient.signUp.email({
				name,
				email,
				password
			});

			if (result.error) {
				error = result.error.message ?? 'Could not create account.';
				loading = false;
				return;
			}

			window.location.href = '/profile';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up | itsMillerTime.dev</title>
</svelte:head>

<div class="signup-container">
	<Panel hasPadding={true} hasBorder={true}>
		<div class="signup-content">
			<h1>Sign Up</h1>
			<p class="subtitle">Create your account</p>

			{#if error}
				<div class="error-message" role="alert">
					<span>{error}</span>
				</div>
			{/if}

			<form class="signup-form" onsubmit={(e) => { e.preventDefault(); signUp(e); }}>
				<input
					type="text"
					name="name"
					autocomplete="name"
					placeholder="Name"
					bind:value={name}
					disabled={loading}
				/>
				<input
					type="email"
					name="email"
					autocomplete="email"
					placeholder="Email"
					bind:value={email}
					disabled={loading}
				/>
				<input
					type="password"
					name="password"
					autocomplete="new-password"
					placeholder="Password"
					bind:value={password}
					disabled={loading}
				/>
				<input
					type="password"
					name="confirmPassword"
					autocomplete="new-password"
					placeholder="Confirm Password"
					bind:value={confirmPassword}
					disabled={loading}
				/>
				<button type="submit" class="submit-btn" disabled={loading}>
					{loading ? 'Creating account...' : 'Create Account'}
				</button>
			</form>

			<p class="login-link">
				Already have an account? <a href="/account/login">Sign in</a>
			</p>
		</div>
	</Panel>
</div>

<style lang="postcss">
	.signup-container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-block: 3rem;
	}

	.signup-content {
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

	.signup-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.signup-form input {
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

	.login-link {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0;

		a {
			color: var(--color-primary);
			text-decoration: underline;

			&:hover {
				color: var(--color-primary-darker);
			}
		}
	}
</style>
