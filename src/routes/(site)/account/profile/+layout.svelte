<script lang="ts">
	import '$lib/components/account/account.css';
	import AccountFrame from '$lib/components/account/AccountFrame.svelte';
	import AccountTabs from '$lib/components/account/AccountTabs.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{#if data.profileUser}
	<div class="account-page">
		<AccountTabs />
		<AccountFrame>
			{@render children()}
		</AccountFrame>
	</div>
{:else}
	<p class="account-missing">Could not load your account. Try signing in again.</p>
{/if}

<style>
	.account-missing {
		max-width: 44rem;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: var(--font-roboto);
		color: var(--color-white-lightest);
	}
</style>
