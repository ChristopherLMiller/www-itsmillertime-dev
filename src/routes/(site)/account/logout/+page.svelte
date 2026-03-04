<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { onMount } from 'svelte';

	let error = $state<string | null>(null);

	onMount(async () => {
		const referrer = document.referrer;
		const fallback = '/';
		const redirectTo = referrer && new URL(referrer).origin === window.location.origin
			? referrer
			: fallback;

		try {
			await authClient.signOut();
			window.location.href = redirectTo;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to sign out.';
		}
	});
</script>

<svelte:head>
	<title>Signing Out... | itsMillerTime.dev</title>
</svelte:head>

<div class="logout-container">
	{#if error}
		<p class="error">{error}</p>
		<a href="/">Go home</a>
	{:else}
		<p>Signing out...</p>
	{/if}
</div>

<style lang="postcss">
	.logout-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-block: 4rem;
		gap: 1rem;
		font-family: var(--font-special-elite);
		color: var(--color-tertiary);
	}

	.error {
		color: var(--color-primary);
	}

	a {
		color: var(--color-primary);
		font-family: var(--font-roboto);
	}
</style>
